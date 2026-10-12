import type { SubjectItem } from '../types';
import { apiRequest } from './httpClient';
import {
  clearTaxonomyCache,
  logDiagnosticWarning,
  readTaxonomyCache,
  writeTaxonomyCache,
} from './localStorage';

export const taxonomyApi = {
  invalidateCache: (): void => {
    clearTaxonomyCache();
  },

  getSubjectsTree: async (forceRefresh = false): Promise<SubjectItem[]> => {
    if (!forceRefresh) {
      const cached = readTaxonomyCache();
      if (cached) {
        const ageMs = Date.now() - cached.ts;
        if (ageMs < 10 * 60 * 1000) {
          if (ageMs > 2 * 60 * 1000) {
            apiRequest<SubjectItem[]>('/api/resources/taxonomy')
              .then((fresh) => {
                writeTaxonomyCache(fresh);
              })
              .catch((err) => {
                logDiagnosticWarning('taxonomyApi.backgroundRevalidate', err);
              });
          }
          return cached.data;
        }
      }
    }

    try {
      const fresh = await apiRequest<SubjectItem[]>('/api/resources/taxonomy');
      writeTaxonomyCache(fresh);
      return fresh;
    } catch (err) {
      logDiagnosticWarning('taxonomyApi.getSubjectsTree', err);
      const stale = readTaxonomyCache();
      return stale ? stale.data : [];
    }
  },
};
