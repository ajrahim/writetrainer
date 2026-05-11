export type EssayType = "Issue" | "Argument";

export type AiReviewProvider = "openai" | "anthropic" | "gemini";

export type OpenAiReasoningEffort = "minimal" | "low" | "medium" | "high";

export type ReviewSource = "ai" | "local";

export type ReviewProviderSetting = {
  provider: AiReviewProvider;
  enabled: boolean;
  apiKey?: string;
  model?: string;
  reasoningEffort?: OpenAiReasoningEffort;
};

export type ReviewRequestSettings = {
  providers: ReviewProviderSetting[];
};

export type GrePrompt = {
  id: string;
  type: EssayType;
  title: string;
  question: string;
};

export type ScoreDimension = {
  label: string;
  score: number;
  summary: string;
};

export type EssayMetrics = {
  wordCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  vocabularyDiversity: number;
  transitionCount: number;
  grammarFlags: number;
};

export type ReviewResult = {
  overallScore: number;
  scoreOutOfTen: number;
  dimensions: ScoreDimension[];
  feedback: string;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  bandDescription: string;
  metrics: EssayMetrics;
  reviewedAt: string;
};

export type ProviderReview = {
  provider: AiReviewProvider;
  label: string;
  model: string;
  source: ReviewSource;
  review: ReviewResult | null;
  error?: string;
  reviewedAt: string;
};

export type MultiReviewResult = {
  reviews: ProviderReview[];
  reviewedAt: string;
};

export type WritingHistoryEntry = {
  id: string;
  essayName: string;
  prompt: GrePrompt;
  essay: string;
  reviewBundle: MultiReviewResult;
  createdAt: string;
};
