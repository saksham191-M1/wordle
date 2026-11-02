import { describe, it, expect } from 'vitest';
import {
  evaluateGuess,
  checkHardModeConstraints,
  getKeyboardStatuses,
  generateShareText,
} from '../utils/gameLogic.ts';
import { GameSettings } from '../types/game.ts';

describe('Core Game Logic - Guess Evaluation', () => {
  it('correctly evaluates all-green guesses (exact match 5/5)', () => {
    const res = evaluateGuess('APPLE', 'APPLE');
    expect(res).toEqual([
      { char: 'A', status: 'correct' },
      { char: 'P', status: 'correct' },
      { char: 'P', status: 'correct' },
      { char: 'L', status: 'correct' },
      { char: 'E', status: 'correct' },
    ]);
  });

  it('correctly evaluates zero-match guesses (all absent 0/5)', () => {
    const res = evaluateGuess('FUZZY', 'CRANE');
    expect(res).toEqual([
      { char: 'F', status: 'absent' },
      { char: 'U', status: 'absent' },
      { char: 'Z', status: 'absent' },
      { char: 'Z', status: 'absent' },
      { char: 'Y', status: 'absent' },
    ]);
  });

  it('correctly evaluates normal mixed guesses with no duplicate letters', () => {
    // Target: CRANE, Guess: TRACE
    // T: absent, R: correct, A: correct, C: present, E: correct
    const res = evaluateGuess('TRACE', 'CRANE');
    expect(res[0]).toEqual({ char: 'T', status: 'absent' });
    expect(res[1]).toEqual({ char: 'R', status: 'correct' });
    expect(res[2]).toEqual({ char: 'A', status: 'correct' });
    expect(res[3]).toEqual({ char: 'C', status: 'present' });
    expect(res[4]).toEqual({ char: 'E', status: 'correct' });
  });

  describe('Duplicate-letter evaluation edge cases', () => {
    it('target has 1 letter, guess has 2 of that letter (SPEED vs CRANE): only first is yellow, second is absent', () => {
      const res = evaluateGuess('SPEED', 'CRANE');
      // In CRANE, there is 1 'E'. In SPEED: pos 2 is E, pos 3 is E.
      // S: absent, P: absent, E(pos 2): present, E(pos 3): absent, D: absent
      expect(res[0]).toEqual({ char: 'S', status: 'absent' });
      expect(res[1]).toEqual({ char: 'P', status: 'absent' });
      expect(res[2]).toEqual({ char: 'E', status: 'present' });
      expect(res[3]).toEqual({ char: 'E', status: 'absent' });
      expect(res[4]).toEqual({ char: 'D', status: 'absent' });
    });

    it('target has 2 of a letter, guess has 1 (CRANE vs SPEED): single occurrence is yellow', () => {
      const res = evaluateGuess('CRANE', 'SPEED');
      // In SPEED: E is at pos 2 and 3. In CRANE: E is at pos 4.
      // C: absent, R: absent, A: absent, N: absent, E: present
      expect(res[4]).toEqual({ char: 'E', status: 'present' });
    });

    it('target has 2 of a letter, guess has 2 in wrong spots: both are yellow', () => {
      // Target: GEESE (G, E, E, S, E), Guess: BLEED (B, L, E, E, D)
      // B: absent, L: absent, E(pos 2): correct, E(pos 3): absent? Wait:
      // In GEESE: indices 1, 2, 4 are E. In BLEED: indices 2, 3 are E.
      // Exact match at index 2 (E === E) -> correct!
      // Index 3: E vs S, target still has unconsumed E at 1 and 4 -> present!
      const res = evaluateGuess('BLEED', 'GEESE');
      expect(res[2]).toEqual({ char: 'E', status: 'correct' });
      expect(res[3]).toEqual({ char: 'E', status: 'present' });
    });

    it('target has 2 of a letter, guess has 2 in wrong spots (both yellow)', () => {
      // Target: SWORD (S, W, O, R, D), Guess: ROSES (R, O, S, E, S)
      // Target has one S, one O, one R.
      // ROSES:
      // R: present, O: present, S: present, E: absent, S: absent (only 1 S in SWORD!)
      const res = evaluateGuess('ROSES', 'SWORD');
      expect(res[0]).toEqual({ char: 'R', status: 'present' });
      expect(res[1]).toEqual({ char: 'O', status: 'present' });
      expect(res[2]).toEqual({ char: 'S', status: 'present' });
      expect(res[3]).toEqual({ char: 'E', status: 'absent' });
      expect(res[4]).toEqual({ char: 'S', status: 'absent' });
    });

    it('exact match takes priority over present match for duplicate letters', () => {
      // Target: ROBOT (R, O, B, O, T)
      // Guess:  TOOTH (T, O, O, T, H)
      // Target counts: R:1, O:2, B:1, T:1
      // Exact match: pos 1 O === O (correct). Remaining O: 1.
      // Pass 2:
      // pos 0: T -> target has one T at pos 4 -> present. Remaining T: 0.
      // pos 2: O -> target has one O remaining -> present. Remaining O: 0.
      // pos 3: T -> target has 0 T remaining -> absent!
      // pos 4: H -> absent.
      const res = evaluateGuess('TOOTH', 'ROBOT');
      expect(res[0]).toEqual({ char: 'T', status: 'present' });
      expect(res[1]).toEqual({ char: 'O', status: 'correct' });
      expect(res[2]).toEqual({ char: 'O', status: 'present' });
      expect(res[3]).toEqual({ char: 'T', status: 'absent' });
      expect(res[4]).toEqual({ char: 'H', status: 'absent' });
    });

    it('handles triple duplicate letters in target and guess (EERIE vs GEESE)', () => {
      // Target: EERIE (E:0, E:1, R:2, I:3, E:4) -> E count = 3
      // Guess:  GEESE (G:0, E:1, E:2, S:3, E:4)
      // Exact: pos 1 E, pos 4 E -> correct! Remaining E in target: 1 (at index 0).
      // Pass 2:
      // pos 0: G -> absent
      // pos 2: E -> remaining E count is 1 -> present! Remaining E: 0.
      // pos 3: S -> absent
      const res = evaluateGuess('GEESE', 'EERIE');
      expect(res[0]).toEqual({ char: 'G', status: 'absent' });
      expect(res[1]).toEqual({ char: 'E', status: 'correct' });
      expect(res[2]).toEqual({ char: 'E', status: 'present' });
      expect(res[3]).toEqual({ char: 'S', status: 'absent' });
      expect(res[4]).toEqual({ char: 'E', status: 'correct' });
    });
  });
});

describe('Hard Mode Constraints', () => {
  it('allows any valid first guess when evaluatedRows is empty', () => {
    const res = checkHardModeConstraints('CRANE', []);
    expect(res.valid).toBe(true);
  });

  it('aggregates green constraints across ALL previous guesses, not just the latest one', () => {
    // Guess 1 revealed pos 0 is 'S'
    const row1 = evaluateGuess('STARE', 'SMART'); // S is correct at 0, A is correct at 2, R is correct at 3
    // Suppose Guess 2 maintained S, A, R, and revealed M at pos 1
    const row2 = evaluateGuess('SMART', 'SMART'); // Won

    // If player makes a guess after row 1 where pos 0 is not S:
    const check1 = checkHardModeConstraints('CRANE', [row1]);
    expect(check1.valid).toBe(false);
    expect(check1.message).toBe('1st letter must be S');

    // If player maintained S, but broke pos 2 (A):
    const check2 = checkHardModeConstraints('SHORE', [row1]);
    expect(check2.valid).toBe(false);
    expect(check2.message).toBe('3rd letter must be A');
  });

  it('enforces multi-guess accumulated green constraints', () => {
    // Guess 1: pos 0 is 'T'
    const row1 = [
      { char: 'T', status: 'correct' as const },
      { char: 'R', status: 'absent' as const },
      { char: 'A', status: 'absent' as const },
      { char: 'I', status: 'absent' as const },
      { char: 'N', status: 'absent' as const },
    ];
    // Guess 2: pos 0 is 'T', pos 4 is 'K'
    const row2 = [
      { char: 'T', status: 'correct' as const },
      { char: 'O', status: 'absent' as const },
      { char: 'U', status: 'absent' as const },
      { char: 'C', status: 'absent' as const },
      { char: 'H', status: 'correct' as const },
    ];

    // Candidate guess maintains T at 0, but misses H at 4
    const check = checkHardModeConstraints('TIGER', [row1, row2]);
    expect(check.valid).toBe(false);
    expect(check.message).toBe('5th letter must be H');

    // Candidate guess maintains both
    const validCheck = checkHardModeConstraints('TEETH', [row1, row2]);
    expect(validCheck.valid).toBe(true);
  });

  it('enforces yellow letter presence across previous guesses', () => {
    // In POUCH against CHAMP:
    // P: present (yellow), O: absent, U: absent, C: present (yellow), H: present (yellow)
    const evalRow = evaluateGuess('POUCH', 'CHAMP');
    expect(evalRow.some(item => item.status === 'correct')).toBe(false); // No greens

    // Candidate lacks C, H, and P
    const check = checkHardModeConstraints('TRAIN', [evalRow]);
    expect(check.valid).toBe(false);
    expect(check.message).toMatch(/Guess must contain (C|H|P)/);
  });

  it('enforces minimum character frequency when duplicate letters are revealed', () => {
    // Guess 1: "SPEED" against target "EERIE"
    // S: absent, P: absent, E: present, E: present, D: absent
    // Reveals that target has at least TWO 'E's!
    const row1 = evaluateGuess('SPEED', 'EERIE');
    expect(row1[2].status).toBe('present');
    expect(row1[3].status).toBe('present');

    // Candidate with only one 'E' must be rejected
    const candidateSingleE = checkHardModeConstraints('HEART', [row1]);
    expect(candidateSingleE.valid).toBe(false);
    expect(candidateSingleE.message).toBe("Guess must contain at least 2 'E's");

    // Candidate with two 'E's is accepted
    const candidateDoubleE = checkHardModeConstraints('FLEET', [row1]);
    expect(candidateDoubleE.valid).toBe(true);
  });

  it('enforces letter frequency from combined green and yellow feedback in the same guess', () => {
    // Target: APPLE, Guess: PAPER
    // P at 0: present (yellow)
    // A at 1: present (yellow)
    // P at 2: correct (green)
    // E at 3: present (yellow)
    // R at 4: absent
    // Letter P was revealed TWICE (1 green, 1 yellow) -> minimum count of P is 2!
    // Letters A and E must also be contained in subsequent guesses.
    const row = evaluateGuess('PAPER', 'APPLE');
    expect(row[0].status).toBe('present');
    expect(row[2].status).toBe('correct');

    // Guess with only 1 'P' even if green at index 2 is maintained and A, E are present
    // e.g. "CAPED" maintains index 2 P, has A and E, but only has ONE P total
    const check = checkHardModeConstraints('CAPED', [row]);
    expect(check.valid).toBe(false);
    expect(check.message).toBe("Guess must contain at least 2 'P's");

    // Guess "APPLE" maintains index 2 P, has 2 'P's, contains A and E
    const validCheck = checkHardModeConstraints('APPLE', [row]);
    expect(validCheck.valid).toBe(true);
  });
});

describe('Keyboard Status Calculation', () => {
  it('gives priority: correct > present > absent', () => {
    // Guess 1 has 'E' as absent
    const row1 = [
      { char: 'E', status: 'absent' as const },
      { char: 'A', status: 'present' as const },
    ];
    // Guess 2 has 'E' as correct
    const row2 = [
      { char: 'E', status: 'correct' as const },
      { char: 'A', status: 'correct' as const },
    ];

    const statuses = getKeyboardStatuses([row1, row2]);
    expect(statuses['E']).toBe('correct');
    expect(statuses['A']).toBe('correct');
  });
});

describe('Share Text Generation', () => {
  const defaultSettings: GameSettings = {
    theme: 'dark',
    hardMode: false,
    highContrast: false,
    soundEnabled: true,
    reducedMotion: false,
  };

  it('generates correct formatted share text for winning daily game', () => {
    const row = evaluateGuess('CRANE', 'CRANE');
    const text = generateShareText({
      mode: 'daily',
      dayIndex: 142,
      guessCount: 1,
      won: true,
      evaluatedRows: [row],
      settings: defaultSettings,
    });

    expect(text).toContain('LexiCraft (Daily #142) 1/6');
    expect(text).toContain('🟩🟩🟩🟩🟩');
  });

  it('includes asterisk when hard mode is enabled', () => {
    const row = evaluateGuess('CRANE', 'CRANE');
    const text = generateShareText({
      mode: 'daily',
      dayIndex: 142,
      guessCount: 1,
      won: true,
      evaluatedRows: [row],
      settings: { ...defaultSettings, hardMode: true },
    });

    expect(text).toContain('LexiCraft (Daily #142) 1/6*');
  });

  it('uses high contrast emojis when highContrast is enabled', () => {
    const row = evaluateGuess('CRANE', 'CRANE');
    const text = generateShareText({
      mode: 'practice',
      guessCount: 1,
      won: true,
      evaluatedRows: [row],
      settings: { ...defaultSettings, highContrast: true },
    });

    expect(text).toContain('🟧🟧🟧🟧🟧');
  });
});
