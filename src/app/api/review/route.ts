import { NextResponse } from "next/server";
import { reviewEssayWithProviders } from "@/lib/aiReviews";
import type {
  AiReviewProvider,
  GrePrompt,
  OpenAiReasoningEffort,
  ReviewProviderSetting,
} from "@/types/review";

export const runtime = "nodejs";

type ReviewRequestBody = {
  essay?: unknown;
  prompt?: unknown;
  settings?: unknown;
};

const validProviders = new Set<AiReviewProvider>([
  "openai",
  "anthropic",
  "gemini",
]);
const validOpenAiReasoningEfforts = new Set<OpenAiReasoningEffort>([
  "minimal",
  "low",
  "medium",
  "high",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrompt(value: unknown): value is GrePrompt {
  return (
    isRecord(value) &&
    "id" in value &&
    "type" in value &&
    "title" in value &&
    "question" in value
  );
}

function isProvider(value: unknown): value is AiReviewProvider {
  return (
    typeof value === "string" && validProviders.has(value as AiReviewProvider)
  );
}

function asTrimmedString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function asOpenAiReasoningEffort(value: unknown) {
  return typeof value === "string" &&
    validOpenAiReasoningEfforts.has(value as OpenAiReasoningEffort)
    ? (value as OpenAiReasoningEffort)
    : undefined;
}

function getProviderSettings(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value) || !Array.isArray(value.providers)) {
    return [];
  }

  const seenProviders = new Set<AiReviewProvider>();
  const providerSettings: ReviewProviderSetting[] = [];

  value.providers.forEach((providerSetting) => {
    if (!isRecord(providerSetting) || !isProvider(providerSetting.provider)) {
      return;
    }

    if (seenProviders.has(providerSetting.provider)) {
      return;
    }

    seenProviders.add(providerSetting.provider);
    providerSettings.push({
      provider: providerSetting.provider,
      enabled: providerSetting.enabled !== false,
      apiKey: asTrimmedString(providerSetting.apiKey, 2400) || undefined,
      model: asTrimmedString(providerSetting.model, 120) || undefined,
      reasoningEffort:
        providerSetting.provider === "openai"
          ? asOpenAiReasoningEffort(providerSetting.reasoningEffort)
          : undefined,
    });
  });

  return providerSettings;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ReviewRequestBody;

  if (typeof body.essay !== "string" || !isPrompt(body.prompt)) {
    return NextResponse.json(
      { error: "Essay and prompt are required." },
      { status: 400 },
    );
  }

  const providerSettings = getProviderSettings(body.settings);

  if (
    providerSettings &&
    !providerSettings.some((setting) => setting.enabled)
  ) {
    return NextResponse.json(
      { error: "Enable at least one review model in settings." },
      { status: 400 },
    );
  }

  const result = await reviewEssayWithProviders(
    body.essay,
    body.prompt,
    providerSettings,
  );

  return NextResponse.json(result);
}
