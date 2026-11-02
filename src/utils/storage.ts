import { DailyHistoryRecord, DailySavedState, GameSettings, UserStats } from '../types/game.ts';
import { getUtcDateKey } from '../data/words.ts';

export const STORAGE_VERSION = 2;

// Storage Keys
const SETTINGS_KEY = 'lexicraft_settings_v2';
const SETTINGS_KEY_LEGACY = 'lexicraft_settings_v1';

const DAILY_STATE_KEY = 'lexicraft_daily_state_v2';
const DAILY_STATE_KEY_LEGACY = 'lexicraft_daily_state_v1';

const DAILY_STATS_KEY = 'lexicraft_daily_stats_v2';
const DAILY_STATS_KEY_LEGACY = 'lexicraft_daily_stats_v1';

const PRACTICE_STATS_KEY = 'lexicraft_practice_stats_v2';
const PRACTICE_STATS_KEY_LEGACY = 'lexicraft_practice_stats_v1';

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
  dailyHistory: {},
};

function safeGetItem<T>(key: string, legacyKey?: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
    if (legacyKey) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) return JSON.parse(legacyRaw) as T;
    }
    return null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or private browsing restriction
  }
}

/**
 * Calculates the difference in whole calendar days between two UTC 'YYYY-MM-DD' dates.
 * Returns positive integer when laterDateKey is in the future relative to earlierDateKey.
 */
export function getUtcDaysDiff(earlierDateKey: string, laterDateKey: string): number {
  if (!earlierDateKey || !laterDateKey) return 999;
  const parts1 = earlierDateKey.split('-').map(Number);
  const parts2 = laterDateKey.split('-').map(Number);
  if (parts1.length !== 3 || parts2.length !== 3) return 999;

  const utc1 = Date.UTC(parts1[0], parts1[1] - 1, parts1[2]);
  const utc2 = Date.UTC(parts2[0], parts2[1] - 1, parts2[2]);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Validates, repairs, and sanitizes restored UserStats objects.
 * Prevents NaN, negative numbers, streak > played anomalies, and corrupted distributions.
 * For daily stats, checks if current streak has lapsed due to a missed UTC date.
 */
export function validateAndMigrateStats(
  raw: unknown,
  isDaily = false,
  currentDateKey: string = getUtcDateKey()
): UserStats {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STATS, guessDistribution: { ...DEFAULT_STATS.guessDistribution }, dailyHistory: {} };
  }

  const s = raw as Record<string, unknown>;

  const played = typeof s.played === 'number' && Number.isFinite(s.played) && s.played >= 0 ? Math.floor(s.played) : 0;
  const won = typeof s.won === 'number' && Number.isFinite(s.won) && s.won >= 0 ? Math.min(played, Math.floor(s.won)) : 0;

  // Validate guess distribution
  const dist: { 1: number; 2: number; 3: number; 4: number; 5: number; 6: number } = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
  };

  const rawDist = (s.guessDistribution && typeof s.guessDistribution === 'object')
    ? (s.guessDistribution as Record<string, unknown>)
    : {};

  let distSum = 0;
  for (let i = 1; i <= 6; i++) {
    const val = rawDist[i];
    const n = typeof val === 'number' && Number.isFinite(val) && val >= 0 ? Math.floor(val) : 0;
    dist[i as 1 | 2 | 3 | 4 | 5 | 6] = n;
    distSum += n;
  }

  // If distribution sum diverges from won, adjust gracefully
  if (distSum > won) {
    for (let i = 1; i <= 6; i++) {
      dist[i as 1 | 2 | 3 | 4 | 5 | 6] = Math.min(dist[i as 1 | 2 | 3 | 4 | 5 | 6], won);
    }
  }

  let maxStreak = typeof s.maxStreak === 'number' && Number.isFinite(s.maxStreak) && s.maxStreak >= 0
    ? Math.min(won, Math.floor(s.maxStreak))
    : 0;

  let currentStreak = typeof s.currentStreak === 'number' && Number.isFinite(s.currentStreak) && s.currentStreak >= 0
    ? Math.min(maxStreak, Math.floor(s.currentStreak))
    : 0;

  const totalTimeSeconds = typeof s.totalTimeSeconds === 'number' && Number.isFinite(s.totalTimeSeconds) && s.totalTimeSeconds >= 0
    ? Math.floor(s.totalTimeSeconds)
    : 0;

  // Daily history map
  const dailyHistory: Record<string, DailyHistoryRecord> = {};
  if (s.dailyHistory && typeof s.dailyHistory === 'object') {
    const rawHist = s.dailyHistory as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawHist)) {
      if (v && typeof v === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(k)) {
        const item = v as Record<string, unknown>;
        dailyHistory[k] = {
          dayIndex: typeof item.dayIndex === 'number' ? item.dayIndex : 1,
          dateKey: k,
          targetWord: typeof item.targetWord === 'string' ? item.targetWord : '',
          guesses: Array.isArray(item.guesses) ? (item.guesses as string[]) : [],
          won: Boolean(item.won),
          attempts: typeof item.attempts === 'number' ? item.attempts : 6,
          completedAt: typeof item.completedAt === 'number' ? item.completedAt : Date.now(),
          durationSeconds: typeof item.durationSeconds === 'number' ? item.durationSeconds : undefined,
        };
      }
    }
  }

  let lastCompletedDateKey = typeof s.lastCompletedDateKey === 'string' ? s.lastCompletedDateKey : undefined;
  let lastWonDateKey = typeof s.lastWonDateKey === 'string' ? s.lastWonDateKey : undefined;

  // Legacy fallback: convert lastWonDate ISO string to dateKey if missing
  if (!lastWonDateKey && typeof s.lastWonDate === 'string' && s.lastWonDate.length >= 10) {
    lastWonDateKey = s.lastWonDate.slice(0, 10);
    if (!lastCompletedDateKey) {
      lastCompletedDateKey = lastWonDateKey;
    }
  }

  // Daily streak validation: if player missed a calendar day, current streak resets to 0
  if (isDaily && lastCompletedDateKey && currentDateKey) {
    const daysSinceLast = getUtcDaysDiff(lastCompletedDateKey, currentDateKey);
    // If more than 1 day has elapsed since the last completed challenge,
    // the player missed at least one challenge day. Reset active streak.
    if (daysSinceLast > 1) {
      currentStreak = 0;
    }
  }

  maxStreak = Math.max(maxStreak, currentStreak);

  return {
    played,
    won,
    currentStreak,
    maxStreak,
    totalTimeSeconds,
    guessDistribution: dist,
    lastWonDateKey,
    lastCompletedDateKey,
    dailyHistory,
  };
}

/**
 * Records a game completion event idempotently and accurately.
 * - Prevents duplicate completion events on daily challenge.
 * - Enforces consecutive-day streak logic (resets if missed day).
 * - Updates guess distributions and durations.
 */
export function recordCompletedGame({
  currentStats,
  isDaily,
  won,
  attempts,
  durationSeconds = 0,
  dateKey = getUtcDateKey(),
  dayIndex = 1,
  targetWord = '',
  guesses = [],
}: {
  currentStats: UserStats;
  isDaily: boolean;
  won: boolean;
  attempts: number;
  durationSeconds?: number;
  dateKey?: string;
  dayIndex?: number;
  targetWord?: string;
  guesses?: string[];
}): { updatedStats: UserStats; alreadyRecorded: boolean } {
  // Guard: if daily challenge was already recorded for this dateKey, do not duplicate
  if (isDaily && currentStats.dailyHistory && currentStats.dailyHistory[dateKey]) {
    return { updatedStats: currentStats, alreadyRecorded: true };
  }

  const newPlayed = currentStats.played + 1;
  const newWon = currentStats.won + (won ? 1 : 0);
  const newTotalTime = (currentStats.totalTimeSeconds || 0) + Math.max(0, durationSeconds);

  let newCurrentStreak = 0;
  if (isDaily) {
    if (won) {
      const prevDate = currentStats.lastCompletedDateKey;
      if (!prevDate) {
        newCurrentStreak = 1;
      } else {
        const diff = getUtcDaysDiff(prevDate, dateKey);
        if (diff === 1) {
          // Exactly consecutive UTC day!
          newCurrentStreak = currentStats.currentStreak + 1;
        } else if (diff === 0) {
          // Same day (should not happen due to guard, but safe fallback)
          newCurrentStreak = currentStats.currentStreak;
        } else {
          // Missed one or more days -> streak resets to 1
          newCurrentStreak = 1;
        }
      }
    } else {
      // Lost daily challenge -> resets to 0
      newCurrentStreak = 0;
    }
  } else {
    // Practice mode streak
    newCurrentStreak = won ? currentStats.currentStreak + 1 : 0;
  }

  const newMaxStreak = Math.max(currentStats.maxStreak, newCurrentStreak);

  // Update distribution
  const newDist = { ...currentStats.guessDistribution };
  if (won && attempts >= 1 && attempts <= 6) {
    const key = attempts as 1 | 2 | 3 | 4 | 5 | 6;
    newDist[key] = (newDist[key] || 0) + 1;
  }

  // Update daily history record if daily
  const updatedDailyHistory = { ...(currentStats.dailyHistory || {}) };
  if (isDaily) {
    updatedDailyHistory[dateKey] = {
      dayIndex,
      dateKey,
      targetWord,
      guesses,
      won,
      attempts,
      completedAt: Date.now(),
      durationSeconds,
    };
  }

  const updatedStats: UserStats = {
    played: newPlayed,
    won: newWon,
    currentStreak: newCurrentStreak,
    maxStreak: newMaxStreak,
    totalTimeSeconds: newTotalTime,
    guessDistribution: newDist,
    lastWonDateKey: won ? dateKey : currentStats.lastWonDateKey,
    lastCompletedDateKey: isDaily ? dateKey : currentStats.lastCompletedDateKey,
    dailyHistory: updatedDailyHistory,
  };

  return { updatedStats, alreadyRecorded: false };
}

export function loadSettings(): GameSettings {
  const settings = safeGetItem<GameSettings>(SETTINGS_KEY, SETTINGS_KEY_LEGACY);
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

export function saveSettings(settings: GameSettings): void {
  safeSetItem(SETTINGS_KEY, settings);
}

export function loadDailyState(currentDayIndex?: number): DailySavedState | null {
  const raw = safeGetItem<DailySavedState>(DAILY_STATE_KEY, DAILY_STATE_KEY_LEGACY);
  if (!raw || typeof raw !== 'object') return null;

  // Validate state structure
  if (typeof raw.dayIndex !== 'number' || !Array.isArray(raw.guesses) || !raw.targetWord) {
    return null;
  }

  // If a current dayIndex was specified and saved state is from another day, do not load
  if (currentDayIndex !== undefined && raw.dayIndex !== currentDayIndex) {
    return null;
  }

  // Validate guesses: array of 5-letter strings
  const validGuesses = raw.guesses.filter(g => typeof g === 'string' && g.length === 5);
  const status = raw.gameStatus === 'WON' || raw.gameStatus === 'LOST' ? raw.gameStatus : 'IN_PROGRESS';

  return {
    version: STORAGE_VERSION,
    dayIndex: raw.dayIndex,
    dateString: raw.dateString || '',
    dateKey: raw.dateKey || '',
    targetWord: raw.targetWord.toUpperCase(),
    guesses: validGuesses,
    gameStatus: status,
    startTime: typeof raw.startTime === 'number' ? raw.startTime : undefined,
    completedTimeSeconds: typeof raw.completedTimeSeconds === 'number' ? raw.completedTimeSeconds : undefined,
    completedAt: typeof raw.completedAt === 'number' ? raw.completedAt : undefined,
  };
}

export function saveDailyState(state: DailySavedState): void {
  safeSetItem(DAILY_STATE_KEY, { ...state, version: STORAGE_VERSION });
}

export function loadDailyStats(currentDateKey?: string): UserStats {
  const raw = safeGetItem<unknown>(DAILY_STATS_KEY, DAILY_STATS_KEY_LEGACY);
  return validateAndMigrateStats(raw, true, currentDateKey);
}

export function saveDailyStats(stats: UserStats): void {
  safeSetItem(DAILY_STATS_KEY, stats);
}

export function loadPracticeStats(): UserStats {
  const raw = safeGetItem<unknown>(PRACTICE_STATS_KEY, PRACTICE_STATS_KEY_LEGACY);
  return validateAndMigrateStats(raw, false);
}

export function savePracticeStats(stats: UserStats): void {
  safeSetItem(PRACTICE_STATS_KEY, stats);
}

export function loadRecentPracticeWords(): string[] {
  const recent = safeGetItem<string[]>(RECENT_WORDS_KEY);
  if (!Array.isArray(recent)) return [];
  return recent.filter(w => typeof w === 'string' && w.length === 5);
}

export function saveRecentPracticeWord(word: string): void {
  const recent = loadRecentPracticeWords();
  const updated = [word.toUpperCase(), ...recent.filter(w => w !== word.toUpperCase())].slice(0, 50);
  safeSetItem(RECENT_WORDS_KEY, updated);
}
