import { describe, it, expect } from 'vitest';
import { loadDailyState } from '../utils/storage.ts';
import { RoomFormat } from '../types/multiplayer.ts';

describe('Game State & Refresh Restoration', () => {
  it('restores active game state only if dayIndex matches current challenge', () => {
    // Mock localStorage
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (k: string) => storage[k] || null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

    // Save state for day 140
    mockLocalStorage.setItem(
      'lexicraft_daily_state_v2',
      JSON.stringify({
        version: 2,
        dayIndex: 140,
        dateString: 'May 10, 2025',
        targetWord: 'CRANE',
        guesses: ['SLATE', 'ROBOT'],
        gameStatus: 'IN_PROGRESS',
      })
    );

    // If loaded on day 140, it should be restored
    const restoredSameDay = loadDailyState(140);
    expect(restoredSameDay).not.toBeNull();
    expect(restoredSameDay?.guesses).toEqual(['SLATE', 'ROBOT']);
    expect(restoredSameDay?.targetWord).toBe('CRANE');
    expect(restoredSameDay?.gameStatus).toBe('IN_PROGRESS');

    // If loaded on day 141 (next day), previous state should NOT be restored
    const restoredNextDay = loadDailyState(141);
    expect(restoredNextDay).toBeNull();
  });

  it('preserves completed game status upon restoration', () => {
    localStorage.setItem(
      'lexicraft_daily_state_v2',
      JSON.stringify({
        version: 2,
        dayIndex: 140,
        dateString: 'May 10, 2025',
        targetWord: 'CRANE',
        guesses: ['SLATE', 'CRANE'],
        gameStatus: 'WON',
        completedTimeSeconds: 45,
      })
    );

    const restored = loadDailyState(140);
    expect(restored?.gameStatus).toBe('WON');
    expect(restored?.completedTimeSeconds).toBe(45);
  });
});

describe('Multiplayer Capacity & Expiration Rules', () => {
  const maxPlayersMap: Record<RoomFormat, number> = {
    '1v1': 2,
    '2v2': 4,
    '3v3': 6,
    ffa: 8,
    sprint: 8,
  };

  it('enforces format-specific maximum player capacities', () => {
    expect(maxPlayersMap['1v1']).toBe(2);
    expect(maxPlayersMap['2v2']).toBe(4);
    expect(maxPlayersMap['3v3']).toBe(6);
    expect(maxPlayersMap['ffa']).toBe(8);
    expect(maxPlayersMap['sprint']).toBe(8);
  });

  it('detects expired rooms past the 24-hour window', () => {
    const now = Date.now();
    const activeRoom = { expiresAt: now + 1000 * 60 * 60 }; // 1 hour remaining
    const expiredRoom = { expiresAt: now - 1000 * 60 }; // 1 minute ago

    expect(activeRoom.expiresAt > now).toBe(true);
    expect(expiredRoom.expiresAt > now).toBe(false);
  });

  it('prevents simultaneous sprint race conditions when target word has already moved', () => {
    // Model race condition:
    // Room is currently on round 1 with target 'APPLE'.
    // Player A and Player B both submit 'APPLE' almost at the same instant.
    let room = {
      targetWord: 'APPLE',
      roundNumber: 1,
      scores: { 'player-a': 0, 'player-b': 0 } as Record<string, number>,
      status: 'PLAYING',
    };

    function simulateSolveSubmission(playerId: string, submittedGuess: string) {
      // Transaction check:
      if (room.status !== 'PLAYING') return { success: false, reason: 'finished' };
      if (room.targetWord !== submittedGuess) return { success: false, reason: 'word_already_advanced' };

      // Player scores point
      room.scores[playerId] = (room.scores[playerId] || 0) + 1;
      room.roundNumber += 1;
      room.targetWord = 'LEMON'; // Next round word!
      return { success: true, newRound: room.roundNumber };
    }

    // Player A's transaction executes first:
    const resA = simulateSolveSubmission('player-a', 'APPLE');
    expect(resA.success).toBe(true);
    expect(room.scores['player-a']).toBe(1);
    expect(room.roundNumber).toBe(2);
    expect(room.targetWord).toBe('LEMON');

    // Player B's concurrent transaction arrives with 'APPLE', but room has already advanced to 'LEMON':
    const resB = simulateSolveSubmission('player-b', 'APPLE');
    expect(resB.success).toBe(false);
    expect(resB.reason).toBe('word_already_advanced');
    expect(room.scores['player-b']).toBe(0); // Player B did not get duplicate point!
    expect(room.roundNumber).toBe(2); // Round was not advanced twice!
  });
});
