import React, { createContext, useContext, useEffect, useState } from 'react';
import type { StudentOnboardingPreferences } from '../types';

type Theme = 'light' | 'dark';
export type ReadingMode = 'standard' | 'comfortable';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  readingMode: ReadingMode;
  toggleReadingMode: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  lowBandwidthMode: boolean;
  toggleLowBandwidthMode: () => void;
  setLowBandwidthMode: (enabled: boolean) => void;
  preferences: StudentOnboardingPreferences;
  updatePreferences: (partial: Partial<StudentOnboardingPreferences>) => void;
  isOnboardingOpen: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'studyshare_theme';
const READING_MODE_STORAGE_KEY = 'studyshare_reading_mode';
const LOW_BANDWIDTH_STORAGE_KEY = 'studyshare_low_bandwidth';
const PREFS_STORAGE_KEY = 'studyshare_student_prefs_v1';

const DEFAULT_PREFERENCES: StudentOnboardingPreferences = {
  university: '',
  department: 'Computer Science & Engineering',
  semester: null,
  selectedCourseIds: [],
  wantsToContribute: true,
  readingMode: 'standard',
  lowBandwidthMode: false,
  completedAt: null,
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return 'dark';
  });

  const [readingMode, setReadingModeState] = useState<ReadingMode>(() => {
    const saved = localStorage.getItem(READING_MODE_STORAGE_KEY);
    return saved === 'comfortable' ? 'comfortable' : 'standard';
  });

  const [lowBandwidthMode, setLowBandwidthState] = useState<boolean>(() => {
    return localStorage.getItem(LOW_BANDWIDTH_STORAGE_KEY) === 'true';
  });

  const [preferences, setPreferencesState] = useState<StudentOnboardingPreferences>(() => {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
      }
    } catch {
      // ignore corrupted storage
    }
    return DEFAULT_PREFERENCES;
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-reading-mode', readingMode);
    localStorage.setItem(READING_MODE_STORAGE_KEY, readingMode);
  }, [readingMode]);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-low-bandwidth',
      lowBandwidthMode ? 'true' : 'false'
    );
    localStorage.setItem(LOW_BANDWIDTH_STORAGE_KEY, lowBandwidthMode ? 'true' : 'false');
  }, [lowBandwidthMode]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleReadingMode = () => {
    setReadingModeState((prev) => (prev === 'standard' ? 'comfortable' : 'standard'));
  };

  const setReadingMode = (mode: ReadingMode) => {
    setReadingModeState(mode);
  };

  const toggleLowBandwidthMode = () => {
    setLowBandwidthState((prev) => !prev);
  };

  const setLowBandwidthMode = (enabled: boolean) => {
    setLowBandwidthState(enabled);
  };

  const updatePreferences = (partial: Partial<StudentOnboardingPreferences>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      if (partial.readingMode) {
        setReadingModeState(partial.readingMode);
      }
      if (typeof partial.lowBandwidthMode === 'boolean') {
        setLowBandwidthState(partial.lowBandwidthMode);
      }
      return next;
    });
  };

  const openOnboarding = () => setIsOnboardingOpen(true);
  const closeOnboarding = () => setIsOnboardingOpen(false);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        readingMode,
        toggleReadingMode,
        setReadingMode,
        lowBandwidthMode,
        toggleLowBandwidthMode,
        setLowBandwidthMode,
        preferences,
        updatePreferences,
        isOnboardingOpen,
        openOnboarding,
        closeOnboarding,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
