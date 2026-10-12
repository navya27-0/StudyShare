import type { ResourceListItem, SubjectItem } from '../types';

const TAXONOMY_CACHE_KEY = 'studyshare_taxonomy_cache_v2';
const TAXONOMY_SCHEMA_VERSION = 2;
const DOWNLOAD_HISTORY_KEY = 'studyshare_download_history_v1';
const OFFLINE_BOOKMARKS_KEY = 'studyshare_offline_bookmarks_v1';

interface VersionedTaxonomyCache {
  version: number;
  ts: number;
  data: SubjectItem[];
}

export function logDiagnosticWarning(context: string, err: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[StudyShare:${context}]`, err);
  }
}

export const getDownloadedIds = (): Set<number> => {
  try {
    const raw = localStorage.getItem(DOWNLOAD_HISTORY_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (err) {
    logDiagnosticWarning('localStorage.getDownloadedIds', err);
    return new Set();
  }
};

export const markResourceDownloaded = (resourceId: number): void => {
  try {
    const current = getDownloadedIds();
    current.add(resourceId);
    localStorage.setItem(DOWNLOAD_HISTORY_KEY, JSON.stringify(Array.from(current).slice(-200)));
  } catch (err) {
    logDiagnosticWarning('localStorage.markResourceDownloaded', err);
  }
};

export const getOfflineBookmarks = (): ResourceListItem[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResourceListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logDiagnosticWarning('localStorage.getOfflineBookmarks', err);
    return [];
  }
};

export const saveOfflineBookmarks = (items: ResourceListItem[]): void => {
  try {
    localStorage.setItem(OFFLINE_BOOKMARKS_KEY, JSON.stringify(items.slice(0, 100)));
  } catch (err) {
    logDiagnosticWarning('localStorage.saveOfflineBookmarks', err);
  }
};

export const readTaxonomyCache = (): { ts: number; data: SubjectItem[] } | null => {
  try {
    const raw = localStorage.getItem(TAXONOMY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VersionedTaxonomyCache;
    if (
      parsed &&
      parsed.version === TAXONOMY_SCHEMA_VERSION &&
      Array.isArray(parsed.data) &&
      parsed.data.length > 0
    ) {
      return { ts: parsed.ts || 0, data: parsed.data };
    }
    return null;
  } catch (err) {
    logDiagnosticWarning('localStorage.readTaxonomyCache', err);
    return null;
  }
};

export const writeTaxonomyCache = (data: SubjectItem[]): void => {
  try {
    const payload: VersionedTaxonomyCache = {
      version: TAXONOMY_SCHEMA_VERSION,
      ts: Date.now(),
      data,
    };
    localStorage.setItem(TAXONOMY_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    logDiagnosticWarning('localStorage.writeTaxonomyCache', err);
  }
};

export const clearTaxonomyCache = (): void => {
  try {
    localStorage.removeItem(TAXONOMY_CACHE_KEY);
    localStorage.removeItem('studyshare_taxonomy_cache_v1');
  } catch (err) {
    logDiagnosticWarning('localStorage.clearTaxonomyCache', err);
  }
};
