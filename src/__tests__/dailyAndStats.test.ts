import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { getDailyWordAndIndex, getUtcDateKey, TARGET_WORDS } from '../data/words.ts';
import {
  getUtcDaysDiff,
  validateAndMigrateStats,
  recordCompletedGame,
  DEFAULT_STATS,
  DEFAULT_SETTINGS,
} from '../utils/storage.ts';
import { UserStats } from '../types/game.ts';
import { Header } from '../components/Header.tsx';

describe('Daily Challenge UTC Determinism', () => {
  it('consistently produces the identical target word and dayIndex for a given UTC date', () => {
    const fixedDate = new Date('2025-06-15T12:00:00Z');
    const res1 = getDailyWordAndIndex(fixedDate);
    const res2 = getDailyWordAndIndex(new Date('2025-06-15T23:59:59Z'));
    const res3 = getDailyWordAndIndex(new Date('2025-06-15T00:00:01Z'));

    expect(res1.word).toBe(res2.word);
    expect(res1.word).toBe(res3.word);
    expect(res1.dayIndex).toBe(res2.dayIndex);
    expect(res1.dayIndex).toBe(res3.dayIndex);
    expect(res1.dateKey).toBe('2025-06-15');
  });

  it('accurately advances the dayIndex and word across UTC midnight transitions', () => {
    const day1 = new Date('2025-06-15T23:59:59Z');
    const day2 = new Date('2025-06-16T00:00:00Z');

    const res1 = getDailyWordAndIndex(day1);
    const res2 = getDailyWordAndIndex(day2);

    expect(res2.dayIndex).toBe(res1.dayIndex + 1);
    expect(res1.dateKey).toBe('2025-06-15');
    expect(res2.dateKey).toBe('2025-06-16');

    // Expected word matches mathematical modulo in TARGET_WORDS
    expect(res2.word).toBe(TARGET_WORDS[res2.dayIndex % TARGET_WORDS.length]);
  });

  it('correctly maps Jan 1, 2024 to dayIndex 1', () => {
    const epochDate = new Date('2024-01-01T12:00:00Z');
    const res = getDailyWordAndIndex(epochDate);
    expect(res.dayIndex).toBe(1);
    expect(res.dateKey).toBe('2024-01-01');
  });
});

describe('Streak Calculation & Date Continuity', () => {
  it('correctly calculates whole day difference between UTC date strings', () => {
    expect(getUtcDaysDiff('2025-01-01', '2025-01-02')).toBe(1);
    expect(getUtcDaysDiff('2025-01-01', '2025-01-01')).toBe(0);
    expect(getUtcDaysDiff('2025-01-01', '2025-01-03')).toBe(2);
    expect(getUtcDaysDiff('2025-01-31', '2025-02-01')).toBe(1);
    expect(getUtcDaysDiff('2024-12-31', '2025-01-01')).toBe(1);
  });

  it('starts streak at 1 on first daily win', () => {
    const initialStats: UserStats = { ...DEFAULT_STATS, guessDistribution: { ...DEFAULT_STATS.guessDistribution } };
    const { updatedStats } = recordCompletedGame({
      currentStats: initialStats,
      isDaily: true,
      won: true,
      attempts: 3,
      dateKey: '2025-05-01',
    });

    expect(updatedStats.played).toBe(1);
    expect(updatedStats.won).toBe(1);
    expect(updatedStats.currentStreak).toBe(1);
    expect(updatedStats.maxStreak).toBe(1);
    expect(updatedStats.guessDistribution[3]).toBe(1);
    expect(updatedStats.lastCompletedDateKey).toBe('2025-05-01');
  });

  it('increments streak on consecutive daily wins (diff === 1)', () => {
    let stats: UserStats = {
      ...DEFAULT_STATS,
      played: 1,
      won: 1,
      currentStreak: 1,
      maxStreak: 1,
      lastCompletedDateKey: '2025-05-01',
      dailyHistory: {
        '2025-05-01': {
          dayIndex: 1,
          dateKey: '2025-05-01',
          targetWord: 'APPLE',
          guesses: ['APPLE'],
          won: true,
          attempts: 1,
          completedAt: 100,
        },
      },
    };

    const { updatedStats } = recordCompletedGame({
      currentStats: stats,
      isDaily: true,
      won: true,
      attempts: 4,
      dateKey: '2025-05-02',
    });

    expect(updatedStats.played).toBe(2);
    expect(updatedStats.won).toBe(2);
    expect(updatedStats.currentStreak).toBe(2);
    expect(updatedStats.maxStreak).toBe(2);
    expect(updatedStats.guessDistribution[4]).toBe(1);
    expect(updatedStats.lastCompletedDateKey).toBe('2025-05-02');
  });

  it('resets streak to 1 on win if a daily challenge day was missed (diff > 1)', () => {
    let stats: UserStats = {
      ...DEFAULT_STATS,
      played: 5,
      won: 5,
      currentStreak: 5,
      maxStreak: 5,
      lastCompletedDateKey: '2025-05-01',
    };

    // Next game played on May 3 (May 2 was missed!)
    const { updatedStats } = recordCompletedGame({
      currentStats: stats,
      isDaily: true,
      won: true,
      attempts: 2,
      dateKey: '2025-05-03',
    });

    expect(updatedStats.played).toBe(6);
    expect(updatedStats.won).toBe(6);
    expect(updatedStats.currentStreak).toBe(1); // Reset to 1 due to missed day!
    expect(updatedStats.maxStreak).toBe(5); // Max streak preserved
  });

  it('resets current streak to 0 on a loss', () => {
    let stats: UserStats = {
      ...DEFAULT_STATS,
      played: 3,
      won: 3,
      currentStreak: 3,
      maxStreak: 3,
      lastCompletedDateKey: '2025-05-01',
    };

    const { updatedStats } = recordCompletedGame({
      currentStats: stats,
      isDaily: true,
      won: false,
      attempts: 6,
      dateKey: '2025-05-02',
    });

    expect(updatedStats.played).toBe(4);
    expect(updatedStats.won).toBe(3);
    expect(updatedStats.currentStreak).toBe(0);
    expect(updatedStats.maxStreak).toBe(3);
  });

  it('prevents duplicate completion events on the same daily date', () => {
    let stats: UserStats = {
      ...DEFAULT_STATS,
      played: 1,
      won: 1,
      currentStreak: 1,
      maxStreak: 1,
      lastCompletedDateKey: '2025-05-01',
      dailyHistory: {
        '2025-05-01': {
          dayIndex: 1,
          dateKey: '2025-05-01',
          targetWord: 'APPLE',
          guesses: ['APPLE'],
          won: true,
          attempts: 1,
          completedAt: 100,
        },
      },
    };

    // Submitting again for the exact same dateKey
    const { updatedStats, alreadyRecorded } = recordCompletedGame({
      currentStats: stats,
      isDaily: true,
      won: true,
      attempts: 1,
      dateKey: '2025-05-01',
    });

    expect(alreadyRecorded).toBe(true);
    expect(updatedStats.played).toBe(1);
    expect(updatedStats.won).toBe(1);
    expect(updatedStats.currentStreak).toBe(1);
  });
});

describe('Win on Each of Six Attempts and Six-Attempt Loss', () => {
  it('correctly tracks win distribution across all six attempts (1 through 6)', () => {
    let stats: UserStats = { ...DEFAULT_STATS, guessDistribution: { ...DEFAULT_STATS.guessDistribution } };

    // Wins on attempts 1, 2, 3, 4, 5, 6 in practice mode
    for (let attempt = 1; attempt <= 6; attempt++) {
      const res = recordCompletedGame({
        currentStats: stats,
        isDaily: false,
        won: true,
        attempts: attempt,
      });
      stats = res.updatedStats;
      expect(stats.guessDistribution[attempt as 1 | 2 | 3 | 4 | 5 | 6]).toBe(1);
      expect(stats.won).toBe(attempt);
      expect(stats.played).toBe(attempt);
    }
  });

  it('correctly records a six-attempt loss without incrementing any guess distribution row', () => {
    const stats: UserStats = { ...DEFAULT_STATS, guessDistribution: { ...DEFAULT_STATS.guessDistribution } };
    const { updatedStats } = recordCompletedGame({
      currentStats: stats,
      isDaily: false,
      won: false,
      attempts: 6,
    });

    expect(updatedStats.played).toBe(1);
    expect(updatedStats.won).toBe(0);
    expect(updatedStats.currentStreak).toBe(0);
    for (let i = 1; i <= 6; i++) {
      expect(updatedStats.guessDistribution[i as 1 | 2 | 3 | 4 | 5 | 6]).toBe(0);
    }
  });
});

describe('Restored Statistics Validation & Migration', () => {
  it('sanitizes corrupted statistics: NaN, negative values, and streak anomalies', () => {
    const corruptedRaw = {
      played: -10,
      won: 999, // won > played
      currentStreak: 50,
      maxStreak: 10,
      guessDistribution: { 1: -5, 2: 'bad', 3: 4 },
    };

    const sanitized = validateAndMigrateStats(corruptedRaw, false);

    expect(sanitized.played).toBe(0);
    expect(sanitized.won).toBe(0);
    expect(sanitized.currentStreak).toBe(0);
    expect(sanitized.maxStreak).toBe(0);
    expect(sanitized.guessDistribution[1]).toBe(0);
    expect(sanitized.guessDistribution[2]).toBe(0);
  });

  it('resets current streak on loading daily stats if a day was missed', () => {
    const savedDailyStats = {
      played: 5,
      won: 5,
      currentStreak: 5,
      maxStreak: 5,
      lastCompletedDateKey: '2025-05-10',
    };

    // Loaded on May 12 (May 11 was missed!)
    const validated = validateAndMigrateStats(savedDailyStats, true, '2025-05-12');

    expect(validated.currentStreak).toBe(0); // Resets because yesterday was missed!
    expect(validated.maxStreak).toBe(5); // Preserved
  });

  it('preserves current streak on loading daily stats if played yesterday', () => {
    const savedDailyStats = {
      played: 5,
      won: 5,
      currentStreak: 5,
      maxStreak: 5,
      lastCompletedDateKey: '2025-05-10',
    };

    // Loaded on May 11 (yesterday was played, today is available)
    const validated = validateAndMigrateStats(savedDailyStats, true, '2025-05-11');

    expect(validated.currentStreak).toBe(5);
  });
});

describe('Header Daily Streak Badge', () => {
  const dummyProps = {
    mode: 'daily' as const,
    onSelectMode: () => {},
    dayIndex: 100,
    settings: DEFAULT_SETTINGS,
    onToggleSound: () => {},
    onToggleTheme: () => {},
    onOpenHelp: () => {},
    onOpenStats: () => {},
    onOpenSettings: () => {},
    onOpenMultiplayer: () => {},
  };

  it('does NOT render the streak badge when daily streak is 0', () => {
    const html = renderToString(React.createElement(Header, { ...dummyProps, dailyStreak: 0 }));
    expect(html).not.toContain('data-testid="daily-streak-badge"');
  });

  it('does NOT render the streak badge when daily streak is 1', () => {
    const html = renderToString(React.createElement(Header, { ...dummyProps, dailyStreak: 1 }));
    expect(html).not.toContain('data-testid="daily-streak-badge"');
  });

  it('renders the streak badge when daily streak is greater than 1', () => {
    const html = renderToString(React.createElement(Header, { ...dummyProps, dailyStreak: 4 }));
    expect(html).toContain('data-testid="daily-streak-badge"');
    expect(html).toContain('4');
    expect(html).toContain('Daily Challenge Streak: 4 days');
  });

  it('renders the streak badge across different game modes if streak > 1', () => {
    const practiceHtml = renderToString(
      React.createElement(Header, { ...dummyProps, mode: 'practice', dailyStreak: 7 })
    );
    expect(practiceHtml).toContain('data-testid="daily-streak-badge"');
    expect(practiceHtml).toContain('7');
  });

  it('adds animate-streak-pulse to streak badge when celebrateStreak is true and reducedMotion is false', () => {
    const html = renderToString(
      React.createElement(Header, {
        ...dummyProps,
        dailyStreak: 3,
        celebrateStreak: true,
        settings: { ...DEFAULT_SETTINGS, reducedMotion: false },
      })
    );
    expect(html).toContain('data-testid="daily-streak-badge"');
    expect(html).toContain('animate-streak-pulse');
  });

  it('does NOT add animate-streak-pulse when celebrateStreak is false', () => {
    const html = renderToString(
      React.createElement(Header, {
        ...dummyProps,
        dailyStreak: 3,
        celebrateStreak: false,
        settings: { ...DEFAULT_SETTINGS, reducedMotion: false },
      })
    );
    expect(html).toContain('data-testid="daily-streak-badge"');
    expect(html).not.toContain('animate-streak-pulse');
  });

  it('respects reducedMotion setting and suppresses animate-streak-pulse when reducedMotion is true', () => {
    const html = renderToString(
      React.createElement(Header, {
        ...dummyProps,
        dailyStreak: 5,
        celebrateStreak: true,
        settings: { ...DEFAULT_SETTINGS, reducedMotion: true },
      })
    );
    expect(html).toContain('data-testid="daily-streak-badge"');
    expect(html).not.toContain('animate-streak-pulse');
  });
});
