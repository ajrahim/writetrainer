"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, X } from "lucide-react";
import {
  getDefaultLocalReviewSettings,
  normalizeLocalReviewSettings,
  OPENAI_REASONING_EFFORT_OPTIONS,
  REVIEW_PROVIDER_OPTIONS,
  type LocalReviewProviderSetting,
  type LocalReviewSettings,
} from "@/lib/localReviewSettings";
import type { AiReviewProvider } from "@/types/review";

type SettingsModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  settings: LocalReviewSettings;
  onClose: () => void;
  onSave: (settings: LocalReviewSettings) => void;
};

const hiddenKeys: Record<AiReviewProvider, boolean> = {
  openai: false,
  anthropic: false,
  gemini: false,
};

function getProviderSetting(
  settings: LocalReviewSettings,
  provider: AiReviewProvider,
): LocalReviewProviderSetting {
  const providerSetting = settings.providers.find(
    (setting) => setting.provider === provider,
  );

  if (providerSetting) {
    return providerSetting;
  }

  return getDefaultLocalReviewSettings().providers.find(
    (setting) => setting.provider === provider,
  ) as LocalReviewProviderSetting;
}

export function SettingsModal({
  isOpen,
  isSaving,
  settings,
  onClose,
  onSave,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const normalizedSettings = useMemo(
    () => normalizeLocalReviewSettings(settings),
    [settings],
  );
  const [draftSettings, setDraftSettings] = useState(normalizedSettings);
  const [visibleKeys, setVisibleKeys] = useState(hiddenKeys);
  const [selectedProvider, setSelectedProvider] =
    useState<AiReviewProvider>("openai");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftSettings(normalizedSettings);
    setVisibleKeys(hiddenKeys);
    setSelectedProvider("openai");
  }, [isOpen, normalizedSettings]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusTimeoutId = window.setTimeout(
      () => dialogRef.current?.focus(),
      0,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeoutId);
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const updateProvider = (
    provider: AiReviewProvider,
    updates: Partial<LocalReviewProviderSetting>,
  ) => {
    setDraftSettings((currentSettings) => ({
      version: currentSettings.version,
      providers: currentSettings.providers.map((providerSetting) =>
        providerSetting.provider === provider
          ? { ...providerSetting, ...updates }
          : providerSetting,
      ),
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(normalizeLocalReviewSettings(draftSettings));
  };

  const activeOption =
    REVIEW_PROVIDER_OPTIONS.find(
      (option) => option.provider === selectedProvider,
    ) ?? REVIEW_PROVIDER_OPTIONS[0];
  const activeProviderSetting = getProviderSetting(
    draftSettings,
    activeOption.provider,
  );
  const isActiveKeyVisible = visibleKeys[activeOption.provider];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/45 backdrop-blur-[1px]"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-settings-title"
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl outline-none dark:border-stone-800 dark:bg-stone-950"
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3.5 dark:border-stone-800 sm:px-5">
          <div className="flex min-w-0 items-center">
            <div className="min-w-0">
              <h2
                id="review-settings-title"
                className="truncate text-base font-semibold tracking-tight text-stone-950 dark:text-stone-50"
              >
                Review Settings
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Stored locally in this browser. Blank fields fall back to
                default settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            title="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <aside className="shrink-0 border-b border-stone-200 bg-stone-50 p-2 dark:border-stone-800 dark:bg-stone-900/50 sm:w-60 sm:border-b-0 sm:border-r">
              <p className="hidden px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 sm:block">
                Models
              </p>
              <div
                role="tablist"
                aria-label="Review models"
                className="space-y-1"
              >
                {REVIEW_PROVIDER_OPTIONS.map((option) => {
                  const providerSetting = getProviderSetting(
                    draftSettings,
                    option.provider,
                  );
                  const isSelected = option.provider === activeOption.provider;

                  return (
                    <div
                      key={option.provider}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-white/70 dark:hover:bg-stone-950/60"
                    >
                      <button
                        type="button"
                        role="tab"
                        id={`settings-tab-${option.provider}`}
                        aria-controls={`settings-panel-${option.provider}`}
                        aria-selected={isSelected}
                        onClick={() => setSelectedProvider(option.provider)}
                        className={`min-w-0 flex-1 rounded-md px-1 py-1 text-left text-sm outline-none transition focus:ring-2 focus:ring-stone-400 ${
                          providerSetting.enabled
                            ? "font-medium text-stone-800 dark:text-stone-100"
                            : "text-stone-500 dark:text-stone-500"
                        }`}
                      >
                        <span className="block truncate">{option.label}</span>
                      </button>
                      <label className="inline-flex shrink-0 cursor-pointer items-center">
                        <span className="sr-only">
                          {providerSetting.enabled
                            ? `Disable ${option.label}`
                            : `Enable ${option.label}`}
                        </span>
                        <input
                          type="checkbox"
                          checked={providerSetting.enabled}
                          onChange={(event) =>
                            updateProvider(option.provider, {
                              enabled: event.target.checked,
                            })
                          }
                          className="peer sr-only"
                        />
                        <span
                          className={`relative h-5 w-9 rounded-full transition peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-stone-400 ${
                            providerSetting.enabled
                              ? "bg-stone-800 dark:bg-stone-200"
                              : "bg-stone-300 dark:bg-stone-700"
                          }`}
                        >
                          <span
                            className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition dark:bg-stone-950 ${
                              providerSetting.enabled ? "translate-x-4" : ""
                            }`}
                          />
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </aside>

            <section
              id={`settings-panel-${activeOption.provider}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${activeOption.provider}`}
              className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
            >
              <div className="max-w-xl space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight text-stone-950 dark:text-stone-50">
                      {activeOption.label}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">
                      {activeProviderSetting.enabled
                        ? "Enabled — this model will be used when reviewing essays."
                        : "Disabled — toggle on in the sidebar to use this model."}
                    </p>
                  </div>
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      activeProviderSetting.enabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-stone-200 bg-stone-100 text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        activeProviderSetting.enabled
                          ? "bg-emerald-500"
                          : "bg-stone-400"
                      }`}
                    />
                    {activeProviderSetting.enabled ? "On" : "Off"}
                  </span>
                </div>

                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
                  Model name
                  <input
                    type="text"
                    value={activeProviderSetting.model}
                    disabled={!activeProviderSetting.enabled}
                    onChange={(event) =>
                      updateProvider(activeOption.provider, {
                        model: event.target.value,
                      })
                    }
                    placeholder="Use default model"
                    className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:border-stone-600 dark:focus:ring-stone-800 dark:disabled:bg-stone-900 dark:disabled:text-stone-500"
                  />
                </label>

                {activeOption.provider === "openai" ? (
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
                    Reasoning level
                    <select
                      value={activeProviderSetting.reasoningEffort ?? "medium"}
                      disabled={!activeProviderSetting.enabled}
                      onChange={(event) =>
                        updateProvider(activeOption.provider, {
                          reasoningEffort: event.target.value as NonNullable<
                            LocalReviewProviderSetting["reasoningEffort"]
                          >,
                        })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-950 outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:border-stone-600 dark:focus:ring-stone-800 dark:disabled:bg-stone-900 dark:disabled:text-stone-500"
                    >
                      {OPENAI_REASONING_EFFORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300">
                  Local API key
                  <div className="relative mt-1">
                    <KeyRound
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                      aria-hidden="true"
                    />
                    <input
                      type={isActiveKeyVisible ? "text" : "password"}
                      value={activeProviderSetting.apiKey}
                      disabled={!activeProviderSetting.enabled}
                      onChange={(event) =>
                        updateProvider(activeOption.provider, {
                          apiKey: event.target.value,
                        })
                      }
                      placeholder="Use default API key"
                      autoComplete="off"
                      spellCheck={false}
                      className="h-10 w-full rounded-lg border border-stone-200 bg-white px-9 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50 dark:focus:border-stone-600 dark:focus:ring-stone-800 dark:disabled:bg-stone-900 dark:disabled:text-stone-500"
                    />
                    <button
                      type="button"
                      disabled={!activeProviderSetting.enabled}
                      onClick={() =>
                        setVisibleKeys((currentKeys) => ({
                          ...currentKeys,
                          [activeOption.provider]:
                            !currentKeys[activeOption.provider],
                        }))
                      }
                      aria-label={
                        isActiveKeyVisible
                          ? `Hide ${activeOption.label} key`
                          : `Show ${activeOption.label} key`
                      }
                      title={isActiveKeyVisible ? "Hide key" : "Show key"}
                      className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:cursor-not-allowed disabled:text-stone-300 dark:text-stone-400 dark:hover:bg-stone-900 dark:disabled:text-stone-700"
                    >
                      {isActiveKeyVisible ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-stone-200 bg-stone-50/60 px-4 py-3 dark:border-stone-800 dark:bg-stone-900/30 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="hidden text-xs text-stone-500 dark:text-stone-400 sm:block">
              Changes apply to your next review.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-900 bg-stone-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:border-stone-700 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white dark:focus:ring-offset-stone-950"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {isSaving ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
