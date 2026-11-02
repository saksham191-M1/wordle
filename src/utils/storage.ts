import { DailySavedState, GameSettings, UserStats } from '../types/game.ts';

const SETTINGS_KEY = 'lexicraft_settings_v1';
const DAILY_STATE_KEY = 'lexicraft_daily_state_v1';
const DAILY_STATS_KEY = 'lexicraft_daily_stats_v1';
const PRACTICE_STATS_KEY = 'lexicraft_practice_stats_v1';
const RECENT_WORDS_KEY = 'lexicraft_recent_practice_words_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  theme: 'dark',
  hardMode: false,
  highContrast: false,
  soundEnabled: true,
  reducedMotion: false,
};

export const DEFAULT_STATS: UserStats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalTimeSeconds: 0,
  guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
};

function safeGetItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function safeSetItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or private browsing restriction
  }
}

export function loadSettings(): GameSettings {
  const settings = safeGetItem<GameSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

export function saveSettings(settings: GameSettings): void {
  safeSetItem(SETTINGS_KEY, settings);
}

export function loadDailyState(): DailySavedState | null {
  return safeGetItem<DailySavedState | null>(DAILY_STATE_KEY, null);
}

export function saveDailyState(state: DailySavedState): void {
  safeSetItem(DAILY_STATE_KEY, state);
}

export function loadDailyStats(): UserStats {
  const stats = safeGetItem<UserStats>(DAILY_STATS_KEY, DEFAULT_STATS);
  return {
    ...DEFAULT_STATS,
    ...stats,
    totalTimeSeconds: stats.totalTimeSeconds || 0,
    guessDistribution: { ...DEFAULT_STATS.guessDistribution, ...(stats.guessDistribution || {}) },
  };
}

export function saveDailyStats(stats: UserStats): void {
  safeSetItem(DAILY_STATS_KEY, stats);
}

export function loadPracticeStats(): UserStats {
  const stats = safeGetItem<UserStats>(PRACTICE_STATS_KEY, DEFAULT_STATS);
  return {
    ...DEFAULT_STATS,
    ...stats,
    totalTimeSeconds: stats.totalTimeSeconds || 0,
    guessDistribution: { ...DEFAULT_STATS.guessDistribution, ...(stats.guessDistribution || {}) },
  };
}

export function savePracticeStats(stats: UserStats): void {
  safeSetItem(PRACTICE_STATS_KEY, stats);
}

export function loadRecentPracticeWords(): string[] {
  return safeGetItem<string[]>(RECENT_WORDS_KEY, []);
}

export function saveRecentPracticeWord(word: string): void {
  const recent = loadRecentPracticeWords();
  const updated = [word.toUpperCase(), ...recent.filter(w => w !== word.toUpperCase())].slice(0, 50);
  safeSetItem(RECENT_WORDS_KEY, updated);
}
