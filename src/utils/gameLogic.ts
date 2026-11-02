import { EvaluatedLetter, GameMode, GameSettings } from '../types/game.ts';

/**
 * Two-pass evaluation algorithm that strictly and accurately accounts for letter frequencies.
 *
 * Example:
 * Target: APPLE
 * Guess:  ALLEY
 *
 * Pass 1:
 * - A matches A (idx 0) -> 'correct', target A count: 1 -> 0
 * - L vs P (idx 1) -> not exact
 * - L matches P? No.
 * - E vs L (idx 3) -> not exact
 * - Y vs E (idx 4) -> not exact
 *
 * Pass 2:
 * - L at idx 1: Target has one 'L' available -> 'present', target L count: 1 -> 0
 * - L at idx 2: Target has zero 'L's left -> 'absent'
 * - E at idx 3: Target has one 'E' available -> 'present', target E count: 1 -> 0
 * - Y at idx 4: Not in target -> 'absent'
 */
export function evaluateGuess(guess: string, target: string): EvaluatedLetter[] {
  const guessChars = guess.toUpperCase().split('');
  const targetChars = target.toUpperCase().split('');
  const result: EvaluatedLetter[] = new Array(5);

  // Letter count map of unconsumed characters in target
  const targetCounts: Record<string, number> = {};
  for (const ch of targetChars) {
    targetCounts[ch] = (targetCounts[ch] || 0) + 1;
  }

  // Pass 1: Exact matches (Green)
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = { char: guessChars[i], status: 'correct' };
      targetCounts[guessChars[i]] -= 1;
    }
  }

  // Pass 2: Present letters (Yellow) and Absent letters (Slate)
  for (let i = 0; i < 5; i++) {
    if (result[i]) continue; // Already marked correct

    const ch = guessChars[i];
    if (targetCounts[ch] && targetCounts[ch] > 0) {
      result[i] = { char: ch, status: 'present' };
      targetCounts[ch] -= 1;
    } else {
      result[i] = { char: ch, status: 'absent' };
    }
  }

  return result;
}

/**
 * Enforces Hard Mode constraints before a guess is accepted:
 * 1. Any previously revealed 'correct' letter across ANY previous guess must be used in the exact same spot.
 * 2. Any previously revealed letters ('correct' or 'present') establish a minimum required frequency
 *    for that character (e.g. if a prior guess revealed 2 'E's, the new guess must contain at least 2 'E's).
 */
export function checkHardModeConstraints(
  newGuess: string,
  evaluatedRows: EvaluatedLetter[][]
): { valid: boolean; message?: string } {
  if (evaluatedRows.length === 0) return { valid: true };

  const newChars = newGuess.toUpperCase().split('');

  // 1. Check Greens: aggregate all greens discovered across ANY previous guess
  const fixedGreens: (string | null)[] = [null, null, null, null, null];
  for (const row of evaluatedRows) {
    for (let i = 0; i < 5; i++) {
      if (row[i].status === 'correct') {
        fixedGreens[i] = row[i].char;
      }
    }
  }

  const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
  for (let i = 0; i < 5; i++) {
    if (fixedGreens[i] !== null && newChars[i] !== fixedGreens[i]) {
      return {
        valid: false,
        message: `${ordinals[i]} letter must be ${fixedGreens[i]}`,
      };
    }
  }

  // 2. Track minimum required character frequencies from yellow and green feedback.
  // In any single guess, the sum of 'correct' and 'present' occurrences for letter L
  // provides a strict lower bound on the number of times letter L must appear.
  const minRequiredCounts: Record<string, number> = {};
  for (const row of evaluatedRows) {
    const rowCounts: Record<string, number> = {};
    for (const item of row) {
      if (item.status === 'correct' || item.status === 'present') {
        rowCounts[item.char] = (rowCounts[item.char] || 0) + 1;
      }
    }
    for (const [char, count] of Object.entries(rowCounts)) {
      minRequiredCounts[char] = Math.max(minRequiredCounts[char] || 0, count);
    }
  }

  // Count frequencies in the prospective new guess
  const newCounts: Record<string, number> = {};
  for (const ch of newChars) {
    newCounts[ch] = (newCounts[ch] || 0) + 1;
  }

  // Verify that all required letter frequencies are satisfied
  for (const [char, minCount] of Object.entries(minRequiredCounts)) {
    const actualCount = newCounts[char] || 0;
    if (actualCount < minCount) {
      if (minCount === 1) {
        return {
          valid: false,
          message: `Guess must contain ${char}`,
        };
      } else {
        return {
          valid: false,
          message: `Guess must contain at least ${minCount} '${char}'s`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Calculates current keyboard key statuses with strict priority:
 * 'correct' > 'present' > 'absent'
 */
export function getKeyboardStatuses(
  evaluatedRows: EvaluatedLetter[][]
): Record<string, 'correct' | 'present' | 'absent'> {
  const statuses: Record<string, 'correct' | 'present' | 'absent'> = {};

  for (const row of evaluatedRows) {
    for (const { char, status } of row) {
      const current = statuses[char];
      if (status === 'correct') {
        statuses[char] = 'correct';
      } else if (status === 'present' && current !== 'correct') {
        statuses[char] = 'present';
      } else if (status === 'absent' && !current) {
        statuses[char] = 'absent';
      }
    }
  }

  return statuses;
}

/**
 * Generates formatted emoji grid for sharing.
 */
export function generateShareText({
  mode,
  dayIndex,
  guessCount,
  won,
  evaluatedRows,
  settings,
}: {
  mode: GameMode;
  dayIndex?: number;
  guessCount: number;
  won: boolean;
  evaluatedRows: EvaluatedLetter[][];
  settings: GameSettings;
}): string {
  const modeLabel = mode === 'daily' ? `Daily #${dayIndex}` : 'Practice';
  const score = won ? `${guessCount}/6` : 'X/6';
  const hardStar = settings.hardMode ? '*' : '';

  const correctEmoji = settings.highContrast ? '🟧' : '🟩';
  const presentEmoji = settings.highContrast ? '🟦' : '🟨';
  const absentEmoji = settings.theme === 'dark' ? '⬛' : '⬜';

  const rows = evaluatedRows.map(row => {
    return row.map(tile => {
      if (tile.status === 'correct') return correctEmoji;
      if (tile.status === 'present') return presentEmoji;
      return absentEmoji;
    }).join('');
  }).join('\n');

  return `LexiCraft (${modeLabel}) ${score}${hardStar}\n\n${rows}`;
}
