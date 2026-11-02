/**
 * Word definition and etymology helper.
 * Uses Free Dictionary API with local curated fallbacks for instant offline responses.
 */

export interface WordDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  trivia?: string;
}

const LOCAL_DEFINITIONS: Record<string, WordDefinition> = {
  KAYAK: {
    word: 'KAYAK',
    phonetic: '/ˈkaɪæk/',
    partOfSpeech: 'noun',
    definition: 'A small, narrow watercraft traditionally propelled by a double-bladed paddle. Originating with Indigenous Arctic peoples, modern kayaks are widely used for touring, whitewater sports, and recreation.',
    example: 'They paddled their kayak through the calm waters of the fjord.',
    trivia: 'Wordle Trivia: KAYAK is a famous palindrome—it reads identically forwards and backwards!',
  },
  APPLE: {
    word: 'APPLE',
    phonetic: '/ˈæp.əl/',
    partOfSpeech: 'noun',
    definition: 'The round fruit of a tree of the rose family, typically having thin green or red skin and crisp flesh.',
    example: 'He plucked a crisp red apple straight from the branch.',
  },
  CRANE: {
    word: 'CRANE',
    phonetic: '/kreɪn/',
    partOfSpeech: 'noun',
    definition: 'A large, tall machine used for moving heavy objects, or a tall, long-legged, long-necked bird.',
    example: 'The construction crew used a crane to hoist the steel girders.',
    trivia: 'CRANE is one of the mathematically optimal starting words in Wordle.',
  },
  SLATE: {
    word: 'SLATE',
    phonetic: '/sleɪt/',
    partOfSpeech: 'noun',
    definition: 'A fine-grained grey, green, or bluish metamorphic rock easily split into smooth, flat plates.',
    example: 'The cottages were roofed with dark local slate.',
  },
};

export async function fetchWordDefinition(word: string): Promise<WordDefinition | null> {
  const upper = word.toUpperCase();
  if (LOCAL_DEFINITIONS[upper]) {
    return LOCAL_DEFINITIONS[upper];
  }

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) throw new Error('Not found');

    const data = await res.json();
    if (Array.isArray(data) && data[0]) {
      const entry = data[0];
      const meaning = entry.meanings?.[0];
      const def = meaning?.definitions?.[0];

      return {
        word: upper,
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
        partOfSpeech: meaning?.partOfSpeech || 'noun',
        definition: def?.definition || 'A five-letter English word.',
        example: def?.example,
        trivia: upper === upper.split('').reverse().join('') ? 'This word is a palindrome!' : undefined,
      };
    }
  } catch {
    // Return basic fallback
  }

  const isPalindrome = upper === upper.split('').reverse().join('');
  return {
    word: upper,
    partOfSpeech: 'word',
    definition: `A valid five-letter English vocabulary word.`,
    trivia: isPalindrome ? 'This word is a palindrome!' : undefined,
  };
}
