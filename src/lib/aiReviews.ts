import type {
  AiReviewProvider,
  EssayType,
  GrePrompt,
  MultiReviewResult,
  OpenAiReasoningEffort,
  ProviderReview,
  ReviewProviderSetting,
  ReviewResult,
  ScoreDimension,
} from "@/types/review";
import { scoreEssay } from "./scoring";

type ProviderConfig = {
  provider: AiReviewProvider;
  label: string;
  keyName: string;
  apiKey: string | undefined;
  model: string;
  reasoningEffort?: OpenAiReasoningEffort;
};

type JsonRecord = Record<string, unknown>;

const openAiReasoningEfforts = new Set<string>([
  "minimal",
  "low",
  "medium",
  "high",
]);

const dimensionLabels = [
  "Clarity",
  "Grammar",
  "Structure",
  "Vocabulary",
  "Argument Strength",
];

function isFixedTemperatureOpenAiModel(model: string) {
  const normalized = model.trim().toLowerCase();
  // Reasoning-style OpenAI models (gpt-5*, o1*, o3*, o4*) only allow the
  // default temperature; sending one returns a 400 error.
  return normalized.startsWith("gpt-5") || /^o[134](?:-|$)/.test(normalized);
}

function getOpenAiReasoningEffort(): OpenAiReasoningEffort | undefined {
  const effort = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase();

  return effort && openAiReasoningEfforts.has(effort)
    ? (effort as OpenAiReasoningEffort)
    : undefined;
}

function getOpenAiConfig(): ProviderConfig {
  return {
    provider: "openai",
    label: "ChatGPT",
    keyName: "OPENAI_API_KEY",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    reasoningEffort: getOpenAiReasoningEffort(),
  };
}

function getDefaultProviderConfigs(): ProviderConfig[] {
  return [
    getOpenAiConfig(),
    {
      provider: "anthropic",
      label: "Claude",
      keyName: "ANTHROPIC_API_KEY",
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
    },
    {
      provider: "gemini",
      label: "Gemini",
      keyName: "GEMINI_API_KEY",
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    },
  ];
}

function getProviderConfigs(
  providerSettings?: ReviewProviderSetting[],
): ProviderConfig[] {
  const defaultConfigs = getDefaultProviderConfigs();

  if (!providerSettings) {
    return defaultConfigs;
  }

  const settingsByProvider = new Map(
    providerSettings.map((providerSetting) => [
      providerSetting.provider,
      providerSetting,
    ]),
  );

  return defaultConfigs.flatMap((config) => {
    const providerSetting = settingsByProvider.get(config.provider);

    if (!providerSetting?.enabled) {
      return [];
    }

    return [
      {
        ...config,
        apiKey: providerSetting.apiKey?.trim() || config.apiKey,
        model: providerSetting.model?.trim() || config.model,
        reasoningEffort:
          config.provider === "openai"
            ? (providerSetting.reasoningEffort ?? config.reasoningEffort)
            : config.reasoningEffort,
      },
    ];
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const strings = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return strings.length > 0 ? strings.slice(0, 6) : fallback;
}

function clampScore(value: number) {
  return Math.min(6, Math.max(0, value));
}

function toHalfPoint(value: number) {
  return Math.round(value * 2) / 2;
}

function asScore(value: unknown, fallback: number) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return toHalfPoint(clampScore(numericValue));
}

function toTenPointScore(value: number) {
  return Math.round((value / 6) * 100) / 10;
}

function asTenPointScore(value: unknown, fallbackOverallScore: number) {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return toTenPointScore(fallbackOverallScore);
  }

  return Math.round(Math.min(10, Math.max(0, numericValue)) * 10) / 10;
}

function buildSystemPrompt() {
  return [
    "You are a GRE Analytical Writing reviewer.",
    "Score the essay on the GRE 0-6 scale and return only valid JSON.",
    "Emphasize concrete changes that would raise the score and specific things the writer did well.",
    "Do not include markdown fences or extra commentary.",
  ].join(" ");
}

function buildUserPrompt(
  essay: string,
  prompt: GrePrompt,
  fallback: ReviewResult,
) {
  return JSON.stringify(
    {
      task: "Review this GRE Analytical Writing response.",
      prompt,
      essay,
      localHeuristicReference: {
        score: fallback.overallScore,
        metrics: fallback.metrics,
      },
      requiredJsonShape: {
        overallScore: "number from 0 to 6, half-point increments allowed",
        scoreOutOfTen:
          "number from 0 to 10 for UI display, parsable as a JSON number",
        dimensions: dimensionLabels.map((label) => ({
          label,
          score: "number from 0 to 6",
          summary: "one concise sentence",
        })),
        feedback: "2 to 4 concise sentences",
        suggestions: [
          "specific change the writer should make to earn a higher score",
        ],
        strengths: ["specific thing the writer did well"],
        weaknesses: ["specific score-limiting issue to fix"],
        bandDescription: "one ETS-style band description sentence",
      },
    },
    null,
    2,
  );
}

function getTimeoutMs() {
  const configuredTimeout = Number(process.env.AI_REVIEW_TIMEOUT_MS);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 20000;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractProviderError(payload: unknown) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload.slice(0, 240);
  }

  if (!isRecord(payload)) {
    return null;
  }

  const error = payload.error;

  if (typeof error === "string") {
    return error;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

function parseModelJson(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const startIndex = text.indexOf("{");
    const endIndex = text.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error("The model did not return JSON.");
    }

    return JSON.parse(text.slice(startIndex, endIndex + 1)) as unknown;
  }
}

function normalizeDimensions(rawDimensions: unknown, fallback: ReviewResult) {
  const dimensions = asArray(rawDimensions);

  return fallback.dimensions.map((fallbackDimension): ScoreDimension => {
    const rawDimension = dimensions.find(
      (item) =>
        isRecord(item) &&
        typeof item.label === "string" &&
        item.label.toLowerCase() === fallbackDimension.label.toLowerCase(),
    );

    if (!isRecord(rawDimension)) {
      return fallbackDimension;
    }

    return {
      label: fallbackDimension.label,
      score: asScore(rawDimension.score, fallbackDimension.score),
      summary: asString(rawDimension.summary, fallbackDimension.summary),
    };
  });
}

function normalizeReview(
  rawReview: unknown,
  fallback: ReviewResult,
): ReviewResult {
  if (!isRecord(rawReview)) {
    throw new Error("The model response JSON was not an object.");
  }

  const overallScore = asScore(rawReview.overallScore, fallback.overallScore);

  return {
    overallScore,
    scoreOutOfTen: asTenPointScore(
      rawReview.scoreOutOfTen ?? rawReview.score,
      overallScore,
    ),
    dimensions: normalizeDimensions(rawReview.dimensions, fallback),
    feedback: asString(rawReview.feedback, fallback.feedback),
    suggestions: asStringArray(rawReview.suggestions, fallback.suggestions),
    strengths: asStringArray(rawReview.strengths, fallback.strengths),
    weaknesses: asStringArray(rawReview.weaknesses, fallback.weaknesses),
    bandDescription: asString(
      rawReview.bandDescription,
      fallback.bandDescription,
    ),
    metrics: fallback.metrics,
    reviewedAt: new Date().toISOString(),
  };
}

function getOpenAiText(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("OpenAI returned an unexpected response.");
  }

  const firstChoice = asArray(payload.choices)[0];
  const message = isRecord(firstChoice) ? firstChoice.message : null;

  if (!isRecord(message) || typeof message.content !== "string") {
    throw new Error("OpenAI did not return text content.");
  }

  return message.content;
}

function getAnthropicText(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("Anthropic returned an unexpected response.");
  }

  const text = asArray(payload.content)
    .map((part) =>
      isRecord(part) && typeof part.text === "string" ? part.text : "",
    )
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Claude did not return text content.");
  }

  return text;
}

function getGeminiText(payload: unknown) {
  if (!isRecord(payload)) {
    throw new Error("Gemini returned an unexpected response.");
  }

  const firstCandidate = asArray(payload.candidates)[0];
  const content = isRecord(firstCandidate) ? firstCandidate.content : null;
  const parts = isRecord(content) ? asArray(content.parts) : [];
  const text = parts
    .map((part) =>
      isRecord(part) && typeof part.text === "string" ? part.text : "",
    )
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini did not return text content.");
  }

  return text;
}

async function requestOpenAi(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2,
) {
  const body: JsonRecord = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!isFixedTemperatureOpenAiModel(config.model)) {
    body.temperature = temperature;
  }

  if (config.reasoningEffort) {
    body.reasoning_effort = config.reasoningEffort;
  }

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const payload = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      extractProviderError(payload) ??
        `OpenAI request failed with ${response.status}.`,
    );
  }

  return getOpenAiText(payload);
}

async function requestAnthropic(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
) {
  const response = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey ?? "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    },
  );
  const payload = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      extractProviderError(payload) ??
        `Claude request failed with ${response.status}.`,
    );
  }

  return getAnthropicText(payload);
}

async function requestGemini(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
) {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  const payload = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      extractProviderError(payload) ??
        `Gemini request failed with ${response.status}.`,
    );
  }

  return getGeminiText(payload);
}

async function requestProvider(
  config: ProviderConfig,
  systemPrompt: string,
  userPrompt: string,
) {
  if (config.provider === "openai") {
    return requestOpenAi(config, systemPrompt, userPrompt);
  }

  if (config.provider === "anthropic") {
    return requestAnthropic(config, systemPrompt, userPrompt);
  }

  return requestGemini(config, systemPrompt, userPrompt);
}

function createFallbackReview(
  config: ProviderConfig,
  fallback: ReviewResult,
  error: string,
): ProviderReview {
  const reviewedAt = new Date().toISOString();

  return {
    provider: config.provider,
    label: config.label,
    model: config.model,
    source: "local",
    review: {
      ...fallback,
      reviewedAt,
    },
    error,
    reviewedAt,
  };
}

async function reviewWithProvider(
  config: ProviderConfig,
  fallback: ReviewResult,
  systemPrompt: string,
  userPrompt: string,
): Promise<ProviderReview> {
  if (!config.apiKey) {
    return createFallbackReview(
      config,
      fallback,
      `Missing ${config.keyName}; showing the local heuristic review for ${config.label}.`,
    );
  }

  try {
    const modelText = await requestProvider(config, systemPrompt, userPrompt);
    const review = normalizeReview(parseModelJson(modelText), fallback);

    return {
      provider: config.provider,
      label: config.label,
      model: config.model,
      source: "ai",
      review,
      reviewedAt: review.reviewedAt,
    };
  } catch (error) {
    return createFallbackReview(
      config,
      fallback,
      error instanceof Error
        ? error.message
        : `${config.label} review failed; showing local fallback.`,
    );
  }
}

export async function reviewEssayWithProviders(
  essay: string,
  prompt: GrePrompt,
  providerSettings?: ReviewProviderSetting[],
): Promise<MultiReviewResult> {
  const fallback = scoreEssay(essay, prompt);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(essay, prompt, fallback);
  const reviews = await Promise.all(
    getProviderConfigs(providerSettings).map((config) =>
      reviewWithProvider(config, fallback, systemPrompt, userPrompt),
    ),
  );

  return {
    reviews,
    reviewedAt: new Date().toISOString(),
  };
}

function normalizeEssayType(value: unknown, fallback?: EssayType): EssayType {
  return value === "Argument" || value === "Issue"
    ? value
    : (fallback ?? (Math.random() > 0.5 ? "Issue" : "Argument"));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildPromptSystemPrompt() {
  return [
    "You generate original GRE Analytical Writing practice prompts.",
    "Return only valid JSON with no markdown fences or extra commentary.",
    "Do not copy official ETS prompts; write a fresh prompt in the same academic style.",
  ].join(" ");
}

function buildPromptUserPrompt(promptType?: EssayType) {
  return JSON.stringify(
    {
      task: "Generate one GRE Analytical Writing prompt.",
      promptType: promptType ?? "Randomly choose Issue or Argument.",
      requiredJsonShape: {
        type: "Issue or Argument",
        title: "short academic title, 3 to 7 words",
        question:
          "complete GRE-style writing task with the directive sentence included",
      },
    },
    null,
    2,
  );
}

function normalizeGeneratedPrompt(
  rawPrompt: unknown,
  requestedType?: EssayType,
): GrePrompt {
  if (!isRecord(rawPrompt)) {
    throw new Error("ChatGPT did not return a prompt object.");
  }

  const type = normalizeEssayType(rawPrompt.type, requestedType);
  const title = asString(rawPrompt.title, `${type} Practice Prompt`);
  const question = asString(rawPrompt.question, "");

  if (question.length < 80) {
    throw new Error("ChatGPT returned a prompt that was too short.");
  }

  return {
    id: `gpt-${type.toLowerCase()}-${slugify(title) || "prompt"}-${Date.now()}`,
    type,
    title,
    question,
  };
}

export async function generateGrePromptWithOpenAi(
  promptType?: EssayType,
): Promise<GrePrompt> {
  const config = getOpenAiConfig();

  if (!config.apiKey) {
    throw new Error("Missing OPENAI_API_KEY; add it to .env.local.");
  }

  const modelText = await requestOpenAi(
    config,
    buildPromptSystemPrompt(),
    buildPromptUserPrompt(promptType),
    0.8,
  );

  return normalizeGeneratedPrompt(parseModelJson(modelText), promptType);
}
