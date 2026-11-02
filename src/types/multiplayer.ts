export type RoomFormat = '1v1' | '2v2' | '3v3' | 'ffa' | 'sprint';
export type PlayerTeam = 'teamA' | 'teamB' | 'none';
export type SprintLimitType = 'words' | 'time';

export interface RoomData {
  id: string;
  code: string;
  hostId: string;
  hostName: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  format: RoomFormat;
  targetWord: string;
  roundNumber?: number;
  sprintLimitType?: SprintLimitType;
  sprintTargetWords?: number;
  sprintTimeLimitSeconds?: number;
  sprintExpiresAt?: number;
  roundWinnerName?: string;
  roundWinnerWord?: string;
  nextRoundStartsAt?: number;
  scores?: Record<string, number>;
  teamAGuesses?: string[];
  teamAEmojiRows?: string[];
  teamBGuesses?: string[];
  teamBEmojiRows?: string[];
  winnerId?: string;
  winnerName?: string;
  winningTeam?: 'teamA' | 'teamB' | null;
  expiresAt?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomPlayerData {
  uid: string;
  displayName: string;
  photoURL?: string;
  team: PlayerTeam;
  score?: number;
  guesses: string[];
  emojiRows: string[];
  attempts: number;
  hasWon: boolean;
  hasLost: boolean;
  completionTime?: number;
  updatedAt: string;
}
