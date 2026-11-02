export type LetterStatus = 'correct' | 'present' | 'absent' | 'empty' | 'tbd';

export interface EvaluatedLetter {
  char: string;
  status: 'correct' | 'present' | 'absent';
}

export type GameMode = 'daily' | 'practice' | 'multiplayer';

export type GameStatus = 'IN_PROGRESS' | 'WON' | 'LOST';

export interface GameSettings {
  theme: 'dark' | 'light';
  hardMode: boolean;
  highContrast: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface UserStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  totalTimeSeconds?: number;
  guessDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
  };
  lastWonDate?: string;
}

export interface DailySavedState {
  dayIndex: number;
  dateString: string;
  targetWord: string;
  guesses: string[];
  gameStatus: GameStatus;
  startTime?: number;
  completedTimeSeconds?: number;
  completedAt?: number;
}
