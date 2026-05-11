import type {
  AiReviewProvider,
  OpenAiReasoningEffort,
  ReviewProviderSetting,
  ReviewRequestSettings,
} from "@/types/review";

export type LocalReviewProviderSetting = Required<
  Pick<ReviewProviderSetting, "provider" | "enabled">
> & {
  apiKey: string;
  model: string;
  reasoningEffort?: OpenAiReasoningEffort;
};

export type LocalReviewSettings = {
  version: 2;
  providers: LocalReviewProviderSetting[];
};

export type ReviewProviderOption = {
  provider: AiReviewProvider;
  label: string;
  reviewLabel: string;
  defaultModel: string;
};

type EncryptedSettingsRecord = {
  id: string;
  iv: number[];
  data: number[];
  updatedAt: string;
};

type CryptoKeyRecord = {
  id: string;
  key: CryptoKey;
};

const DATABASE_PREFIX = "write-trainer";
const LEGACY_DATABASE_PREFIX = ["gre", "write", "prep"].join("-");
const DATABASE_NAME = `${DATABASE_PREFIX}-secure-settings`;
const LEGACY_DATABASE_NAME = `${LEGACY_DATABASE_PREFIX}-secure-settings`;
const DATABASE_VERSION = 1;
const SETTINGS_STORE_NAME = "settings";
const KEY_STORE_NAME = "keys";
const SETTINGS_RECORD_ID = "review-settings";
const CRYPTO_KEY_RECORD_ID = "review-settings-key";
const MAX_API_KEY_LENGTH = 2400;
const MAX_MODEL_LENGTH = 120;
const DEFAULT_OPENAI_REASONING_EFFORT: OpenAiReasoningEffort = "medium";

export const OPENAI_REASONING_EFFORT_OPTIONS: Array<{
  value: OpenAiReasoningEffort;
  label: string;
}> = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const openAiReasoningEfforts = new Set<OpenAiReasoningEffort>(
  OPENAI_REASONING_EFFORT_OPTIONS.map((option) => option.value),
);

export const REVIEW_PROVIDER_OPTIONS: ReviewProviderOption[] = [
  {
    provider: "openai",
    label: "ChatGPT",
    reviewLabel: "ChatGPT",
    defaultModel: "gpt-4o-mini",
  },
  {
    provider: "anthropic",
    label: "Claude",
    reviewLabel: "Claude",
    defaultModel: "claude-3-5-sonnet-latest",
  },
  {
    provider: "gemini",
    label: "Google Gemini",
    reviewLabel: "Gemini",
    defaultModel: "gemini-1.5-flash",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function getProviderOption(provider: AiReviewProvider) {
  return REVIEW_PROVIDER_OPTIONS.find((option) => option.provider === provider);
}

function normalizeOpenAiReasoningEffort(value: unknown) {
  return typeof value === "string" &&
    openAiReasoningEfforts.has(value as OpenAiReasoningEffort)
    ? (value as OpenAiReasoningEffort)
    : DEFAULT_OPENAI_REASONING_EFFORT;
}

function getDefaultProviderSetting(
  provider: AiReviewProvider,
): LocalReviewProviderSetting {
  return {
    provider,
    enabled: true,
    apiKey: "",
    model: "",
    ...(provider === "openai"
      ? { reasoningEffort: DEFAULT_OPENAI_REASONING_EFFORT }
      : {}),
  };
}

export function getDefaultLocalReviewSettings(): LocalReviewSettings {
  return {
    version: 2,
    providers: REVIEW_PROVIDER_OPTIONS.map((option) =>
      getDefaultProviderSetting(option.provider),
    ),
  };
}

export function getReviewProviderLabel(provider: AiReviewProvider) {
  return getProviderOption(provider)?.reviewLabel ?? provider;
}

export function normalizeLocalReviewSettings(
  value: unknown,
): LocalReviewSettings {
  if (!isRecord(value) || !Array.isArray(value.providers)) {
    return getDefaultLocalReviewSettings();
  }

  const storedProviders = value.providers;
  const isCurrentVersion = value.version === 2;

  return {
    version: 2,
    providers: REVIEW_PROVIDER_OPTIONS.map((option) => {
      const storedProvider = storedProviders.find(
        (providerSetting) =>
          isRecord(providerSetting) &&
          providerSetting.provider === option.provider,
      );

      if (!isRecord(storedProvider)) {
        return getDefaultProviderSetting(option.provider);
      }

      const storedModel = asString(
        storedProvider.model,
        MAX_MODEL_LENGTH,
      ).trim();
      const model =
        !isCurrentVersion && storedModel === option.defaultModel
          ? ""
          : storedModel;

      return {
        provider: option.provider,
        enabled: storedProvider.enabled !== false,
        apiKey: asString(storedProvider.apiKey, MAX_API_KEY_LENGTH).trim(),
        model,
        ...(option.provider === "openai"
          ? {
              reasoningEffort: normalizeOpenAiReasoningEffort(
                storedProvider.reasoningEffort,
              ),
            }
          : {}),
      };
    }),
  };
}

function canUseEncryptedSettings() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.indexedDB) &&
    Boolean(window.crypto?.subtle) &&
    typeof window.crypto.getRandomValues === "function"
  );
}

function openDatabase(databaseName = DATABASE_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        database.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(KEY_STORE_NAME)) {
        database.createObjectStore(KEY_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local settings."));
  });
}

function readRecord<RecordType>(
  database: IDBDatabase,
  storeName: string,
  key: string,
): Promise<RecordType | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);

    request.onsuccess = () => resolve((request.result as RecordType) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read local settings."));
  });
}

function writeRecord(
  database: IDBDatabase,
  storeName: string,
  record: unknown,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");

    transaction.objectStore(storeName).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save local settings."));
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error("Local settings save was aborted."),
      );
  });
}

async function getOrCreateCryptoKey(database: IDBDatabase) {
  const existingKey = await readRecord<CryptoKeyRecord>(
    database,
    KEY_STORE_NAME,
    CRYPTO_KEY_RECORD_ID,
  );

  if (existingKey?.key) {
    return existingKey.key;
  }

  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  await writeRecord(database, KEY_STORE_NAME, {
    id: CRYPTO_KEY_RECORD_ID,
    key,
  });

  return key;
}

async function encryptSettings(
  settings: LocalReviewSettings,
  key: CryptoKey,
): Promise<EncryptedSettingsRecord> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedSettings = new TextEncoder().encode(JSON.stringify(settings));
  const encryptedSettings = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedSettings,
  );

  return {
    id: SETTINGS_RECORD_ID,
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedSettings)),
    updatedAt: new Date().toISOString(),
  };
}

async function decryptSettings(
  record: EncryptedSettingsRecord,
  key: CryptoKey,
) {
  const decryptedSettings = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(record.iv) },
    key,
    new Uint8Array(record.data),
  );

  return JSON.parse(new TextDecoder().decode(decryptedSettings)) as unknown;
}

async function migrateLegacyLocalReviewSettings(database: IDBDatabase) {
  let legacyDatabase: IDBDatabase | null = null;

  try {
    legacyDatabase = await openDatabase(LEGACY_DATABASE_NAME);
    const legacyRecord = await readRecord<EncryptedSettingsRecord>(
      legacyDatabase,
      SETTINGS_STORE_NAME,
      SETTINGS_RECORD_ID,
    );

    if (!legacyRecord) {
      return null;
    }

    const legacyKeyRecord = await readRecord<CryptoKeyRecord>(
      legacyDatabase,
      KEY_STORE_NAME,
      CRYPTO_KEY_RECORD_ID,
    );

    if (!legacyKeyRecord?.key) {
      return null;
    }

    const decryptedSettings = await decryptSettings(
      legacyRecord,
      legacyKeyRecord.key,
    );
    const normalizedSettings = normalizeLocalReviewSettings(decryptedSettings);
    const key = await getOrCreateCryptoKey(database);
    const encryptedSettings = await encryptSettings(normalizedSettings, key);

    await writeRecord(database, SETTINGS_STORE_NAME, encryptedSettings);

    return normalizedSettings;
  } catch {
    return null;
  } finally {
    legacyDatabase?.close();
  }
}

export async function loadLocalReviewSettings(): Promise<LocalReviewSettings> {
  if (!canUseEncryptedSettings()) {
    return getDefaultLocalReviewSettings();
  }

  const database = await openDatabase();

  try {
    const record = await readRecord<EncryptedSettingsRecord>(
      database,
      SETTINGS_STORE_NAME,
      SETTINGS_RECORD_ID,
    );

    if (!record) {
      return (
        (await migrateLegacyLocalReviewSettings(database)) ??
        getDefaultLocalReviewSettings()
      );
    }

    const key = await getOrCreateCryptoKey(database);
    const decryptedSettings = await decryptSettings(record, key);

    return normalizeLocalReviewSettings(decryptedSettings);
  } finally {
    database.close();
  }
}

export async function saveLocalReviewSettings(settings: LocalReviewSettings) {
  if (!canUseEncryptedSettings()) {
    throw new Error(
      "Encrypted local settings require IndexedDB and Web Crypto support.",
    );
  }

  const database = await openDatabase();

  try {
    const key = await getOrCreateCryptoKey(database);
    const normalizedSettings = normalizeLocalReviewSettings(settings);
    const encryptedSettings = await encryptSettings(normalizedSettings, key);

    await writeRecord(database, SETTINGS_STORE_NAME, encryptedSettings);
  } finally {
    database.close();
  }
}

export function getEnabledLocalReviewProviders(settings: LocalReviewSettings) {
  return normalizeLocalReviewSettings(settings).providers.filter(
    (providerSetting) => providerSetting.enabled,
  );
}

export function formatReviewProviderList(providers: AiReviewProvider[]) {
  const labels = providers.map(
    (provider) => getProviderOption(provider)?.label ?? provider,
  );

  if (labels.length <= 1) {
    return labels[0] ?? "review models";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

export function createReviewRequestSettings(
  settings: LocalReviewSettings,
): ReviewRequestSettings {
  return {
    providers: normalizeLocalReviewSettings(settings).providers.map(
      (providerSetting) => ({
        provider: providerSetting.provider,
        enabled: providerSetting.enabled,
        apiKey: providerSetting.enabled
          ? providerSetting.apiKey.trim() || undefined
          : undefined,
        model: providerSetting.model.trim() || undefined,
        reasoningEffort:
          providerSetting.provider === "openai" && providerSetting.enabled
            ? (providerSetting.reasoningEffort ??
              DEFAULT_OPENAI_REASONING_EFFORT)
            : undefined,
      }),
    ),
  };
}
