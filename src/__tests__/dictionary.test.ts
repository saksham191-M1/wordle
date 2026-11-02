import { describe, it, expect } from 'vitest';
import { TARGET_WORDS, ADDITIONAL_GUESSES, isValidWord } from '../data/words.ts';

describe('Dictionary Integrity Audit', () => {
  it('verifies that TARGET_WORDS contains only valid 5-letter uppercase alphabetic words', () => {
    expect(TARGET_WORDS.length).toBe(2267);

    for (const word of TARGET_WORDS) {
      expect(word).toHaveLength(5);
      expect(word).toMatch(/^[A-Z]{5}$/);
    }
  });

  it('verifies that TARGET_WORDS contains no duplicate words', () => {
    const set = new Set(TARGET_WORDS);
    expect(set.size).toBe(TARGET_WORDS.length);
  });

  it('verifies that ADDITIONAL_GUESSES contains only valid 5-letter uppercase alphabetic words', () => {
    expect(ADDITIONAL_GUESSES.length).toBe(3567);

    for (const word of ADDITIONAL_GUESSES) {
      expect(word).toHaveLength(5);
      expect(word).toMatch(/^[A-Z]{5}$/);
    }
  });

  it('verifies that ADDITIONAL_GUESSES contains no duplicate words and no overlap with TARGET_WORDS', () => {
    const targetSet = new Set(TARGET_WORDS);
    const addSet = new Set(ADDITIONAL_GUESSES);

    expect(addSet.size).toBe(ADDITIONAL_GUESSES.length);

    for (const word of ADDITIONAL_GUESSES) {
      expect(targetSet.has(word)).toBe(false);
    }
  });

  it('ensures all target words belong to the accepted guess dictionary (isValidWord === true)', () => {
    for (const word of TARGET_WORDS) {
      expect(isValidWord(word)).toBe(true);
      expect(isValidWord(word.toLowerCase())).toBe(true);
    }
  });

  it('verifies that all ADDITIONAL_GUESSES are recognized as valid words', () => {
    // Sample spot-check across additional words
    expect(isValidWord('AAHED')).toBe(true);
    expect(isValidWord('ZYGAL')).toBe(true);
    expect(isValidWord('ZYMUM')).toBe(true);
  });

  it('rejects malformed entries, non-5-letter words, and non-existent words', () => {
    // 4-letter words previously in lists
    expect(isValidWord('EXAM')).toBe(false);
    expect(isValidWord('SHED')).toBe(false);
    expect(isValidWord('RIBS')).toBe(false);
    expect(isValidWord('VOID')).toBe(false);
    expect(isValidWord('WAYS')).toBe(false);

    // 6-letter words previously in lists
    expect(isValidWord('MAIDEN')).toBe(false);
    expect(isValidWord('UPBEAT')).toBe(false);
    expect(isValidWord('INCHES')).toBe(false);
    expect(isValidWord('KISSED')).toBe(false);
    expect(isValidWord('UPPING')).toBe(false);

    // Empty, numeric, or invalid inputs
    expect(isValidWord('')).toBe(false);
    expect(isValidWord('12345')).toBe(false);
    expect(isValidWord('ABC')).toBe(false);
    expect(isValidWord('ABCDEFG')).toBe(false);
    expect(isValidWord('XXXXX')).toBe(false);
  });
});
