import type {
  EssayMetrics,
  GrePrompt,
  ReviewResult,
  ScoreDimension,
} from "@/types/review";

const transitionWords = [
  "however",
  "therefore",
  "moreover",
  "furthermore",
  "consequently",
  "nevertheless",
  "although",
  "because",
  "for example",
  "in contrast",
  "similarly",
  "ultimately",
  "first",
  "second",
  "finally",
  "while",
];

const commonGrammarPatterns = [
  /\bi\b/g,
  /\b(me and|him and|her and)\b/gi,
  /\bwould of\b/gi,
  /\bcould of\b/gi,
  /\bshould of\b/gi,
  /\btheir is\b/gi,
  /\bthere is many\b/gi,
  /\balot\b/gi,
  /\birregardless\b/gi,
  /\bmore better\b/gi,
];

const academicTerms = [
  "assumption",
  "evidence",
  "nuance",
  "consequence",
  "perspective",
  "qualification",
  "counterexample",
  "implication",
  "principle",
  "context",
  "causation",
  "correlation",
  "scope",
  "validity",
  "reasonable",
];

const clamp = (value: number, min = 0, max = 6) =>
  Math.min(max, Math.max(min, value));

const roundToHalf = (value: number) => Math.round(value * 2) / 2;

const toTenPointScore = (value: number) => Math.round((value / 6) * 100) / 10;

const countMatches = (text: string, pattern: RegExp) =>
  text.match(pattern)?.length ?? 0;

const getWords = (essay: string) =>
  essay.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];

const getSentences = (essay: string) =>
  essay
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

const getParagraphs = (essay: string) =>
  essay
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

export function getEssayMetrics(essay: string): EssayMetrics {
  const words = getWords(essay);
  const sentences = getSentences(essay);
  const paragraphs = getParagraphs(essay);
  const uniqueWords = new Set(words);
  const normalizedEssay = essay.toLowerCase();

  const transitionCount = transitionWords.reduce((total, word) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return (
      total +
      countMatches(normalizedEssay, new RegExp(`\\b${escapedWord}\\b`, "g"))
    );
  }, 0);

  const grammarFlags = commonGrammarPatterns.reduce(
    (total, pattern) => total + countMatches(essay, pattern),
    0,
  );

  return {
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    averageSentenceLength:
      sentences.length > 0 ? words.length / sentences.length : 0,
    vocabularyDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
    transitionCount,
    grammarFlags,
  };
}

function scoreWordCount(wordCount: number) {
  if (wordCount < 80) return 1.2;
  if (wordCount < 180) return 2.4;
  if (wordCount < 320) return 3.8;
  if (wordCount < 520) return 5.0;
  if (wordCount < 750) return 5.6;
  return 5.2;
}

function scoreParagraphs(paragraphCount: number) {
  if (paragraphCount <= 1) return 2.0;
  if (paragraphCount === 2) return 3.4;
  if (paragraphCount <= 5) return 5.4;
  return 4.8;
}

function scoreSentenceComplexity(
  averageSentenceLength: number,
  sentenceCount: number,
) {
  if (sentenceCount < 3) return 1.8;
  if (averageSentenceLength < 10) return 3.1;
  if (averageSentenceLength <= 26) return 5.2;
  if (averageSentenceLength <= 34) return 4.4;
  return 3.3;
}

function scoreVocabulary(metrics: EssayMetrics, essay: string) {
  const academicHits = academicTerms.filter((term) =>
    essay.toLowerCase().includes(term),
  ).length;
  const diversityScore = clamp(metrics.vocabularyDiversity * 8.2, 1, 5.2);
  return clamp(diversityScore + Math.min(academicHits * 0.12, 0.8));
}

function scoreGrammar(metrics: EssayMetrics) {
  const penalty = Math.min(metrics.grammarFlags * 0.55, 2.6);
  const lengthAdjustment = metrics.wordCount < 120 ? -1.2 : 0;
  return clamp(5.6 - penalty + lengthAdjustment);
}

function scoreTransitions(metrics: EssayMetrics) {
  const density =
    metrics.wordCount > 0 ? metrics.transitionCount / metrics.wordCount : 0;
  if (metrics.transitionCount === 0) return 2.2;
  if (density < 0.008) return 3.7;
  if (density <= 0.035) return 5.3;
  return 4.6;
}

function scoreStructure(metrics: EssayMetrics) {
  return clamp(
    scoreParagraphs(metrics.paragraphCount) * 0.58 +
      scoreTransitions(metrics) * 0.42,
  );
}

function scoreArgumentStrength(
  metrics: EssayMetrics,
  essay: string,
  prompt: GrePrompt,
) {
  const reasoningTerms = [
    "because",
    "therefore",
    "evidence",
    "example",
    "assumption",
    "conclusion",
    "however",
  ];
  const hits = reasoningTerms.filter((term) =>
    essay.toLowerCase().includes(term),
  ).length;
  const promptBonus =
    prompt.type === "Argument" && essay.toLowerCase().includes("assumption")
      ? 0.4
      : 0;
  return clamp(
    scoreWordCount(metrics.wordCount) * 0.32 +
      scoreStructure(metrics) * 0.38 +
      hits * 0.25 +
      promptBonus,
  );
}

function dimension(
  label: string,
  score: number,
  summary: string,
): ScoreDimension {
  return {
    label,
    score: roundToHalf(clamp(score)),
    summary,
  };
}

function getBandDescription(score: number) {
  if (score >= 5.5) {
    return "Strong ETS-style band: insightful, well organized, and consistently controlled writing.";
  }
  if (score >= 4.5) {
    return "Upper-middle ETS-style band: clear reasoning with generally strong development and control.";
  }
  if (score >= 3.5) {
    return "Middle ETS-style band: competent response with some development gaps or uneven control.";
  }
  if (score >= 2.5) {
    return "Developing ETS-style band: limited development, thin organization, or recurring language issues.";
  }
  return "Early ETS-style band: the response needs more sustained reasoning, structure, and language control.";
}

function getSuggestions(metrics: EssayMetrics, dimensions: ScoreDimension[]) {
  const suggestions = new Set<string>();

  if (metrics.wordCount < 350) {
    suggestions.add(
      "Develop each body paragraph with a specific example and one sentence explaining why it proves the point.",
    );
  }

  if (metrics.paragraphCount < 4) {
    suggestions.add(
      "Use a clear introduction, two or three body paragraphs, and a concise conclusion to make the structure easier to follow.",
    );
  }

  if (metrics.transitionCount < 4) {
    suggestions.add(
      "Add signposting words such as however, therefore, for example, and ultimately to clarify relationships between ideas.",
    );
  }

  if (metrics.grammarFlags > 0) {
    suggestions.add(
      "Do a final editing pass for capitalization, agreement, and common phrase errors before submitting.",
    );
  }

  const lowestDimension = [...dimensions].sort((a, b) => a.score - b.score)[0];
  suggestions.add(
    `Prioritize ${lowestDimension.label.toLowerCase()} in the next revision; it is currently the most limiting dimension.`,
  );

  return Array.from(suggestions).slice(0, 5);
}

function getStrengths(metrics: EssayMetrics, dimensions: ScoreDimension[]) {
  const strengths = new Set<string>();
  const topDimensions = [...dimensions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  topDimensions.forEach((item) =>
    strengths.add(`${item.label}: ${item.summary}`),
  );

  if (metrics.wordCount >= 350) {
    strengths.add(
      "The response has enough length to support sustained GRE-style development.",
    );
  }

  if (metrics.transitionCount >= 4) {
    strengths.add(
      "Transitions help the reader track the progression of the argument.",
    );
  }

  return Array.from(strengths).slice(0, 4);
}

function getWeaknesses(metrics: EssayMetrics, dimensions: ScoreDimension[]) {
  const weaknesses = new Set<string>();
  const lowDimensions = dimensions.filter((item) => item.score < 4);

  lowDimensions.forEach((item) =>
    weaknesses.add(`${item.label}: ${item.summary}`),
  );

  if (metrics.averageSentenceLength > 30) {
    weaknesses.add(
      "Several sentences are likely long enough to obscure the main point.",
    );
  }

  if (metrics.wordCount < 250) {
    weaknesses.add(
      "The essay is probably too brief for a high-scoring Analytical Writing response.",
    );
  }

  if (weaknesses.size === 0) {
    weaknesses.add(
      "The next improvement is refinement: add more nuance and sharper examples rather than fixing a single major flaw.",
    );
  }

  return Array.from(weaknesses).slice(0, 4);
}

export function scoreEssay(essay: string, prompt: GrePrompt): ReviewResult {
  const metrics = getEssayMetrics(essay);
  const clarityScore = clamp(
    scoreSentenceComplexity(
      metrics.averageSentenceLength,
      metrics.sentenceCount,
    ) *
      0.44 +
      scoreTransitions(metrics) * 0.26 +
      scoreGrammar(metrics) * 0.3,
  );
  const grammarScore = scoreGrammar(metrics);
  const structureScore = scoreStructure(metrics);
  const vocabularyScore = scoreVocabulary(metrics, essay);
  const argumentScore = scoreArgumentStrength(metrics, essay, prompt);

  const dimensions = [
    dimension(
      "Clarity",
      clarityScore,
      "Ideas are judged by sentence control, transitions, and directness.",
    ),
    dimension(
      "Grammar",
      grammarScore,
      "Surface control is estimated from common grammar-like signals.",
    ),
    dimension(
      "Structure",
      structureScore,
      "Organization reflects paragraphing and logical signposting.",
    ),
    dimension(
      "Vocabulary",
      vocabularyScore,
      "Lexical range rewards variety and academic phrasing without overstatement.",
    ),
    dimension(
      "Argument Strength",
      argumentScore,
      "Reasoning rewards development, evidence, and attention to assumptions.",
    ),
  ];

  const baseScore =
    scoreWordCount(metrics.wordCount) * 0.18 +
    clarityScore * 0.2 +
    grammarScore * 0.17 +
    structureScore * 0.2 +
    vocabularyScore * 0.1 +
    argumentScore * 0.15;

  const overallScore = roundToHalf(clamp(baseScore));

  return {
    overallScore,
    scoreOutOfTen: toTenPointScore(overallScore),
    dimensions,
    feedback:
      overallScore >= 4.5
        ? "This response shows a workable GRE essay shape with enough control to make the central reasoning easy to follow. The strongest next step is to sharpen the examples and make each paragraph's role unmistakable."
        : "This draft has the beginnings of a GRE response, but it needs more developed reasoning, clearer organization, and tighter language control before it would land in a competitive band.",
    suggestions: getSuggestions(metrics, dimensions),
    strengths: getStrengths(metrics, dimensions),
    weaknesses: getWeaknesses(metrics, dimensions),
    bandDescription: getBandDescription(overallScore),
    metrics,
    reviewedAt: new Date().toISOString(),
  };
}
