/**
 * LocalStorage utilities and schemas for reader settings, reading progress, and favorites.
 */

export const STORAGE_KEYS = {
  THEME: "shiyue-theme",
  PROGRESS: "shiyue-progress",
  FAVORITES: "shiyue-favorites",
  READER_SETTINGS: "shiyue-reader-settings",
} as const;

export interface StoredProgressItem {
  bookTitle: string;
  chapterTitle: string;
  chapter: string;
  progress: number;
  chapterProgress: number;
  paragraphIndex?: number;
  href: string;
  updatedAt: number;
}

export type StoredProgress = Record<string, StoredProgressItem>;

export interface StoredReaderSettings {
  fontSize?: number;
  lineHeight?: number;
  width?: number;
  zenMode?: boolean;
}

export interface BackupPayload {
  version: number;
  timestamp: string;
  progress?: StoredProgress;
  favorites?: string[];
  settings?: StoredReaderSettings;
}

export function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageJson<T>(key: string, value: T): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Validates whether an imported JSON payload is safe and conforms to the backup schema.
 */
export function validateBackupPayload(data: unknown): data is BackupPayload {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  const obj = data as Record<string, unknown>;

  if (obj.progress !== undefined) {
    if (typeof obj.progress !== "object" || Array.isArray(obj.progress) || obj.progress === null) {
      return false;
    }
    // Verify each progress item structure
    for (const item of Object.values(obj.progress as Record<string, unknown>)) {
      if (!item || typeof item !== "object" || typeof (item as any).href !== "string") {
        return false;
      }
    }
  }

  if (obj.favorites !== undefined) {
    if (!Array.isArray(obj.favorites) || obj.favorites.some((f) => typeof f !== "string")) {
      return false;
    }
  }

  if (obj.settings !== undefined) {
    if (typeof obj.settings !== "object" || Array.isArray(obj.settings) || obj.settings === null) {
      return false;
    }
  }

  return true;
}
