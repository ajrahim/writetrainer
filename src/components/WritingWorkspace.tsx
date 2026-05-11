"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { grePrompts, defaultPrompt } from "@/data/prompts";
import {
  createReviewRequestSettings,
  formatReviewProviderList,
  getDefaultLocalReviewSettings,
  getEnabledLocalReviewProviders,
  getReviewProviderLabel,
  loadLocalReviewSettings,
  REVIEW_PROVIDER_OPTIONS,
  saveLocalReviewSettings,
  type LocalReviewSettings,
} from "@/lib/localReviewSettings";
import { getEssayMetrics, scoreEssay } from "@/lib/scoring";
import type {
  GrePrompt,
  MultiReviewResult,
  ProviderReview,
  ReviewResult,
  WritingHistoryEntry,
} from "@/types/review";
import { EssayEditor } from "./EssayEditor";
import { Header } from "./Header";
import { HistorySidebar } from "./HistorySidebar";
import { ReviewSidebar } from "./ReviewSidebar";
import { SettingsModal } from "./SettingsModal";
import { WelcomeModal } from "./WelcomeModal";

const TIMER_SECONDS = 30 * 60;
const STORAGE_PREFIX = "write-trainer";
const LEGACY_STORAGE_PREFIX = ["gre", "write", "prep"].join("-");
const WORKSPACE_STORAGE_KEY = `${STORAGE_PREFIX}:workspace:v1`;
const HISTORY_STORAGE_KEY = `${STORAGE_PREFIX}:history:v1`;
const THEME_STORAGE_KEY = `${STORAGE_PREFIX}:theme`;
const WELCOME_STORAGE_KEY = `${STORAGE_PREFIX}:welcome-seen:v1`;
const LEGACY_WORKSPACE_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}:workspace:v1`;
const LEGACY_HISTORY_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}:history:v1`;
const LEGACY_THEME_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}:theme`;
const MAX_HISTORY_ENTRIES = 24;

type StoredWorkspace = {
  essay: string;
  activePromptId?: string;
  activePrompt?: GrePrompt;
  remainingSeconds: number;
  isTimerRunning: boolean;
  timerUpdatedAt: number;
  review: MultiReviewResult | ReviewResult | null;
};

type StoredLocalValue = {
  key: string;
  value: string;
  isLegacy: boolean;
};

const localFallbackProviders: Array<
  Pick<ProviderReview, "provider" | "label" | "model">
> = REVIEW_PROVIDER_OPTIONS.map((option) => ({
  provider: option.provider,
  label: option.reviewLabel,
  model: "Local fallback",
}));

function getPromptById(
  promptId: string,
  prompts: GrePrompt[] = grePrompts,
): GrePrompt {
  return prompts.find((prompt) => prompt.id === promptId) ?? defaultPrompt;
}

function getRandomLocalPrompt(excludedPromptId?: string) {
  const availablePrompts = grePrompts.filter(
    (prompt) => prompt.id !== excludedPromptId,
  );
  const promptPool =
    availablePrompts.length > 0 ? availablePrompts : grePrompts;

  return promptPool[Math.floor(Math.random() * promptPool.length)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrompt(value: unknown): value is GrePrompt {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.type === "Issue" || value.type === "Argument") &&
    typeof value.title === "string" &&
    typeof value.question === "string"
  );
}

function readLocalStorageValue(
  storageKey: string,
  legacyStorageKey: string,
): StoredLocalValue | null {
  const value = window.localStorage.getItem(storageKey);

  if (value !== null) {
    return { key: storageKey, value, isLegacy: false };
  }

  const legacyValue = window.localStorage.getItem(legacyStorageKey);

  return legacyValue !== null
    ? { key: legacyStorageKey, value: legacyValue, isLegacy: true }
    : null;
}

function migrateLocalStorageValue(
  storageKey: string,
  storedValue: StoredLocalValue,
) {
  if (storedValue.isLegacy) {
    window.localStorage.setItem(storageKey, storedValue.value);
  }
}

function removeLocalStorageValue(
  storageKey: string,
  storedValue: StoredLocalValue,
) {
  window.localStorage.removeItem(storageKey);

  if (storedValue.isLegacy) {
    window.localStorage.removeItem(storedValue.key);
  }
}

function createLocalReviewBundle(
  review: ReviewResult,
  error = "Review API unavailable; showing the local heuristic review.",
  providers = localFallbackProviders,
): MultiReviewResult {
  const reviewedAt = new Date().toISOString();

  return {
    reviewedAt,
    reviews: providers.map((provider) => ({
      ...provider,
      source: "local",
      review: {
        ...review,
        reviewedAt,
      },
      error,
      reviewedAt,
    })),
  };
}

function getLocalFallbackProviders(settings: LocalReviewSettings) {
  const enabledProviders = getEnabledLocalReviewProviders(settings);

  if (!enabledProviders.length) {
    return localFallbackProviders;
  }

  return enabledProviders.map((providerSetting) => ({
    provider: providerSetting.provider,
    label: getReviewProviderLabel(providerSetting.provider),
    model: providerSetting.model.trim() || "Local fallback",
  }));
}

function normalizeStoredReview(
  storedReview: StoredWorkspace["review"],
): MultiReviewResult | null {
  if (!isRecord(storedReview)) {
    return null;
  }

  const storedRecord = storedReview as Record<string, unknown>;

  if (Array.isArray(storedRecord.reviews)) {
    return storedRecord as MultiReviewResult;
  }

  if (typeof storedRecord.overallScore === "number") {
    return createLocalReviewBundle(
      storedRecord as ReviewResult,
      "Migrated from a previous single-review draft.",
    );
  }

  return null;
}

function normalizeStoredHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is WritingHistoryEntry => {
    if (!isRecord(entry) || !isPrompt(entry.prompt)) {
      return false;
    }

    return (
      typeof entry.id === "string" &&
      typeof entry.essayName === "string" &&
      typeof entry.essay === "string" &&
      typeof entry.createdAt === "string" &&
      isRecord(entry.reviewBundle) &&
      Array.isArray(entry.reviewBundle.reviews)
    );
  });
}

function createEssayName(essay: string, prompt: GrePrompt) {
  const words = essay
    .replace(/[^a-zA-Z0-9'\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  if (words.length >= 3) {
    return words.join(" ");
  }

  return `${prompt.type}: ${prompt.title}`;
}

export function WritingWorkspace() {
  const [essay, setEssay] = useState("");
  const [activePrompt, setActivePrompt] = useState(defaultPrompt);
  const [remainingSeconds, setRemainingSeconds] = useState(TIMER_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [reviewBundle, setReviewBundle] = useState<MultiReviewResult | null>(
    null,
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<WritingHistoryEntry[]>(
    [],
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [reviewSettings, setReviewSettings] = useState<LocalReviewSettings>(
    () => getDefaultLocalReviewSettings(),
  );
  const [themeReady, setThemeReady] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const essayRef = useRef(essay);
  const promptRef = useRef(defaultPrompt);
  const isReviewingRef = useRef(false);
  const autoReviewTriggeredRef = useRef(false);
  const expiredOnLoadRef = useRef(false);
  const shouldGenerateInitialPromptRef = useRef(false);
  const metrics = useMemo(() => getEssayMetrics(essay), [essay]);
  const reviewProviderSummary = useMemo(() => {
    const enabledProviders = getEnabledLocalReviewProviders(reviewSettings);

    return formatReviewProviderList(
      enabledProviders.map((providerSetting) => providerSetting.provider),
    );
  }, [reviewSettings]);

  useEffect(() => {
    essayRef.current = essay;
  }, [essay]);

  useEffect(() => {
    promptRef.current = activePrompt;
  }, [activePrompt]);

  const persistHistoryEntry = useCallback((reviewBundle: MultiReviewResult) => {
    const createdAt = new Date().toISOString();
    const entry: WritingHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      essayName: createEssayName(essayRef.current, promptRef.current),
      prompt: promptRef.current,
      essay: essayRef.current,
      reviewBundle,
      createdAt,
    };

    setHistoryEntries((currentEntries) => {
      const nextEntries = [entry, ...currentEntries].slice(
        0,
        MAX_HISTORY_ENTRIES,
      );
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(nextEntries),
      );
      return nextEntries;
    });
  }, []);

  const generatePrompt = useCallback(async () => {
    if (isPromptLoading) {
      return;
    }

    setIsPromptLoading(true);
    setToast("Generating a ChatGPT writing prompt...");

    try {
      const response = await fetch("/api/prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as {
        prompt?: unknown;
        error?: string;
      } | null;

      if (!response.ok || !isPrompt(payload?.prompt)) {
        throw new Error(
          payload?.error ?? "ChatGPT did not return a usable prompt.",
        );
      }

      const nextPrompt = payload.prompt;
      setActivePrompt(nextPrompt);
      promptRef.current = nextPrompt;
      setReviewBundle(null);
      setToast("ChatGPT prompt loaded.");
    } catch (error) {
      const fallbackPrompt = getRandomLocalPrompt(promptRef.current.id);
      setActivePrompt(fallbackPrompt);
      promptRef.current = fallbackPrompt;
      setReviewBundle(null);
      setToast(
        error instanceof Error
          ? `${error.message} Showing a local random prompt.`
          : "Showing a local random prompt.",
      );
    } finally {
      setIsPromptLoading(false);
    }
  }, [isPromptLoading]);

  useEffect(() => {
    let isMounted = true;

    void loadLocalReviewSettings()
      .then((savedSettings) => {
        if (isMounted) {
          setReviewSettings(savedSettings);
        }
      })
      .catch(() => {
        if (isMounted) {
          setToast(
            "Secure review settings could not be loaded. Defaults are active.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const triggerReview = useCallback(
    async (reason: "manual" | "expired" = "manual") => {
      if (isReviewingRef.current) {
        return;
      }

      const enabledProviders = getEnabledLocalReviewProviders(reviewSettings);

      if (!enabledProviders.length) {
        setToast("Enable at least one review model in settings.");
        return;
      }

      const providerList = formatReviewProviderList(
        enabledProviders.map((providerSetting) => providerSetting.provider),
      );

      isReviewingRef.current = true;
      setIsReviewing(true);
      setIsHistoryOpen(false);
      setIsReviewPanelOpen(true);
      setToast(
        reason === "expired"
          ? `Time expired. Reviewing with ${providerList}.`
          : `Reviewing with ${providerList}...`,
      );

      try {
        const response = await fetch("/api/review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            essay: essayRef.current,
            prompt: promptRef.current,
            settings: createReviewRequestSettings(reviewSettings),
          }),
        });

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(errorPayload?.error ?? "Review request failed.");
        }

        const result = (await response.json()) as MultiReviewResult;
        const fallbackCount = result.reviews.filter(
          (providerReview) => providerReview.source === "local",
        ).length;

        setReviewBundle(result);
        persistHistoryEntry(result);

        if (fallbackCount === 0) {
          const reviewNoun = result.reviews.length === 1 ? "review" : "reviews";
          setToast(`${providerList} ${reviewNoun} ready.`);
        } else if (fallbackCount === result.reviews.length) {
          setToast(
            "Reviews ready using local fallbacks. Add API keys for live AI.",
          );
        } else {
          setToast("Reviews ready. Some providers used local fallback.");
        }
      } catch (error) {
        const fallbackReview = scoreEssay(essayRef.current, promptRef.current);
        const fallbackBundle = createLocalReviewBundle(
          fallbackReview,
          error instanceof Error
            ? error.message
            : "Review service unavailable.",
          getLocalFallbackProviders(reviewSettings),
        );
        setReviewBundle(fallbackBundle);
        persistHistoryEntry(fallbackBundle);
        setToast("Review service unavailable. Showing local fallback reviews.");
      } finally {
        setIsReviewing(false);
        isReviewingRef.current = false;
      }
    },
    [persistHistoryEntry, reviewSettings],
  );

  useEffect(() => {
    const savedTheme = readLocalStorageValue(
      THEME_STORAGE_KEY,
      LEGACY_THEME_STORAGE_KEY,
    );
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme =
      savedTheme?.value === "dark" || (!savedTheme && prefersDark)
        ? "dark"
        : "light";
    if (savedTheme?.value === "dark" || savedTheme?.value === "light") {
      migrateLocalStorageValue(THEME_STORAGE_KEY, savedTheme);
    }
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setThemeReady(true);
    setIsWelcomeOpen(
      window.localStorage.getItem(WELCOME_STORAGE_KEY) !== "dismissed",
    );

    const savedHistory = readLocalStorageValue(
      HISTORY_STORAGE_KEY,
      LEGACY_HISTORY_STORAGE_KEY,
    );
    if (savedHistory) {
      try {
        const historyEntries = normalizeStoredHistory(
          JSON.parse(savedHistory.value),
        ).slice(0, MAX_HISTORY_ENTRIES);

        setHistoryEntries(historyEntries);

        if (savedHistory.isLegacy) {
          window.localStorage.setItem(
            HISTORY_STORAGE_KEY,
            JSON.stringify(historyEntries),
          );
        }
      } catch {
        removeLocalStorageValue(HISTORY_STORAGE_KEY, savedHistory);
      }
    }

    const savedWorkspace = readLocalStorageValue(
      WORKSPACE_STORAGE_KEY,
      LEGACY_WORKSPACE_STORAGE_KEY,
    );

    if (savedWorkspace) {
      try {
        const parsed = JSON.parse(savedWorkspace.value) as StoredWorkspace;
        const savedEssay = parsed.essay ?? "";
        const savedPromptFromPayload = isPrompt(parsed.activePrompt)
          ? parsed.activePrompt
          : null;
        const savedPrompt = savedPromptFromPayload
          ? savedPromptFromPayload
          : getPromptById(parsed.activePromptId ?? defaultPrompt.id);
        const savedRemaining = Number.isFinite(parsed.remainingSeconds)
          ? parsed.remainingSeconds
          : TIMER_SECONDS;
        const elapsedSeconds = parsed.isTimerRunning
          ? Math.floor((Date.now() - parsed.timerUpdatedAt) / 1000)
          : 0;
        const adjustedRemaining = Math.max(0, savedRemaining - elapsedSeconds);

        essayRef.current = savedEssay;
        promptRef.current = savedPrompt;
        setEssay(savedEssay);
        setActivePrompt(savedPrompt);
        setRemainingSeconds(adjustedRemaining);
        setIsTimerRunning(
          Boolean(parsed.isTimerRunning && adjustedRemaining > 0),
        );
        setReviewBundle(normalizeStoredReview(parsed.review ?? null));

        if (parsed.isTimerRunning && adjustedRemaining === 0) {
          expiredOnLoadRef.current = true;
          autoReviewTriggeredRef.current = true;
        }

        migrateLocalStorageValue(WORKSPACE_STORAGE_KEY, savedWorkspace);
      } catch {
        removeLocalStorageValue(WORKSPACE_STORAGE_KEY, savedWorkspace);
        const initialPrompt = getRandomLocalPrompt();
        promptRef.current = initialPrompt;
        setActivePrompt(initialPrompt);
        shouldGenerateInitialPromptRef.current = true;
      }
    } else {
      const initialPrompt = getRandomLocalPrompt();
      promptRef.current = initialPrompt;
      setActivePrompt(initialPrompt);
      shouldGenerateInitialPromptRef.current = true;
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded || !shouldGenerateInitialPromptRef.current) {
      return;
    }

    shouldGenerateInitialPromptRef.current = false;
    void generatePrompt();
  }, [generatePrompt, hasLoaded]);

  useEffect(() => {
    if (!themeReady) {
      return;
    }

    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, themeReady]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    const payload: StoredWorkspace = {
      essay,
      activePromptId: activePrompt.id,
      activePrompt,
      remainingSeconds,
      isTimerRunning,
      timerUpdatedAt: Date.now(),
      review: reviewBundle,
    };

    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
  }, [
    activePrompt,
    essay,
    hasLoaded,
    isTimerRunning,
    remainingSeconds,
    reviewBundle,
  ]);

  useEffect(() => {
    if (!hasLoaded || !expiredOnLoadRef.current) {
      return;
    }

    expiredOnLoadRef.current = false;
    triggerReview("expired");
  }, [hasLoaded, triggerReview]);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(intervalId);
          setIsTimerRunning(false);

          if (!autoReviewTriggeredRef.current) {
            autoReviewTriggeredRef.current = true;
            window.setTimeout(() => triggerReview("expired"), 0);
          }

          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTimerRunning, triggerReview]);

  useEffect(() => {
    if (isWelcomeOpen || isSettingsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        triggerReview("manual");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, isWelcomeOpen, triggerReview]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!isReviewPanelOpen || isSettingsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReviewPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReviewPanelOpen, isSettingsOpen]);

  const handleStartTimer = useCallback(() => {
    if (remainingSeconds === 0) {
      setRemainingSeconds(TIMER_SECONDS);
      autoReviewTriggeredRef.current = false;
    }

    setIsTimerRunning(true);
  }, [remainingSeconds]);

  const handlePauseTimer = useCallback(() => {
    setIsTimerRunning(false);
  }, []);

  const handleResetTimer = useCallback(() => {
    setRemainingSeconds(TIMER_SECONDS);
    setIsTimerRunning(false);
    autoReviewTriggeredRef.current = false;
    setToast("Timer reset to 30:00.");
  }, []);

  const handleHistoryEntrySelect = useCallback((entry: WritingHistoryEntry) => {
    setActivePrompt(entry.prompt);
    setEssay(entry.essay);
    setReviewBundle(entry.reviewBundle);
    promptRef.current = entry.prompt;
    essayRef.current = entry.essay;
    setToast(`${entry.essayName} loaded.`);
  }, []);

  const handleSettingsClose = useCallback(() => {
    if (!isSettingsSaving) {
      setIsSettingsOpen(false);
    }
  }, [isSettingsSaving]);

  const handleWelcomeStart = useCallback(() => {
    window.localStorage.setItem(WELCOME_STORAGE_KEY, "dismissed");
    setIsWelcomeOpen(false);
  }, []);

  const handleSettingsSave = useCallback(
    async (nextSettings: LocalReviewSettings) => {
      setIsSettingsSaving(true);

      try {
        await saveLocalReviewSettings(nextSettings);
        setReviewSettings(nextSettings);
        setIsSettingsOpen(false);
        setToast("Review settings saved.");
      } catch (error) {
        setToast(
          error instanceof Error
            ? error.message
            : "Review settings could not be saved.",
        );
      } finally {
        setIsSettingsSaving(false);
      }
    },
    [],
  );

  return (
    <div className="h-dvh overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <HistorySidebar
        entries={historyEntries}
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen((value) => !value)}
        onSelectEntry={handleHistoryEntrySelect}
      />

      <div className="flex h-dvh min-h-0 flex-col sm:pl-14">
        <Header
          isReviewing={isReviewing}
          isHistoryOpen={isHistoryOpen}
          isReviewPanelOpen={isReviewPanelOpen}
          theme={theme}
          onReview={() => triggerReview("manual")}
          onToggleHistory={() => setIsHistoryOpen((value) => !value)}
          onOpenSettings={() => {
            setIsHistoryOpen(false);
            setIsSettingsOpen(true);
          }}
          onToggleReviewPanel={() =>
            setIsReviewPanelOpen((isOpen) => {
              if (!isOpen) {
                setIsHistoryOpen(false);
              }

              return !isOpen;
            })
          }
          onThemeChange={setTheme}
        />

        <main
          className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row"
          aria-label="GRE writing workspace"
        >
          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <EssayEditor
              prompt={activePrompt}
              essay={essay}
              wordCount={metrics.wordCount}
              paragraphCount={metrics.paragraphCount}
              remainingSeconds={remainingSeconds}
              isTimerRunning={isTimerRunning}
              isPromptLoading={isPromptLoading}
              onGeneratePrompt={generatePrompt}
              onStartTimer={handleStartTimer}
              onPauseTimer={handlePauseTimer}
              onResetTimer={handleResetTimer}
              onChange={setEssay}
            />
          </div>
          {isReviewPanelOpen ? (
            <button
              type="button"
              aria-label="Close AI review panel"
              onClick={() => setIsReviewPanelOpen(false)}
              className="fixed inset-0 z-40 bg-stone-950/35 backdrop-blur-[1px] lg:hidden"
            />
          ) : null}
          <ReviewSidebar
            reviewBundle={reviewBundle}
            isReviewing={isReviewing}
            isOpen={isReviewPanelOpen}
            reviewProviderSummary={reviewProviderSummary}
            onClose={() => setIsReviewPanelOpen(false)}
          />
        </main>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        isSaving={isSettingsSaving}
        settings={reviewSettings}
        onClose={handleSettingsClose}
        onSave={handleSettingsSave}
      />

      <WelcomeModal isOpen={isWelcomeOpen} onStart={handleWelcomeStart} />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="animate-toast-in fixed left-1/2 top-4 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-stone-200 bg-white/95 px-4 py-3 text-sm font-medium text-stone-800 shadow-lg backdrop-blur dark:border-stone-800 dark:bg-stone-950/95 dark:text-stone-100"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
