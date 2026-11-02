import React from 'react';
import { EvaluatedLetter } from '../types/game.ts';
import { Tile } from './Tile.tsx';

interface GameBoardProps {
  guesses: string[];
  evaluatedRows: EvaluatedLetter[][];
  currentGuess: string;
  isInvalidShake: boolean;
  isEvaluating: boolean;
  wonRowIndex: number | null;
  highContrast: boolean;
  reducedMotion: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  guesses,
  evaluatedRows,
  currentGuess,
  isInvalidShake,
  isEvaluating,
  wonRowIndex,
  highContrast,
  reducedMotion,
}) => {
  const TOTAL_ROWS = 6;
  const currentRowIndex = guesses.length;

  return (
    <div
      className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 my-auto py-2 sm:py-4"
      role="grid"
      aria-label="Wordle game grid"
    >
      {Array.from({ length: TOTAL_ROWS }).map((_, rowIndex) => {
        const isCurrentRow = rowIndex === currentRowIndex;
        const isCompletedRow = rowIndex < currentRowIndex;
        const isWinningRow = wonRowIndex === rowIndex;
        const isFlippingRow = isEvaluating && rowIndex === currentRowIndex - 1;

        // Determine letters and statuses for this row
        let letters: string[] = ['', '', '', '', ''];
        let statuses: Array<'correct' | 'present' | 'absent' | 'empty' | 'tbd'> = [
          'empty',
          'empty',
          'empty',
          'empty',
          'empty',
        ];

        if (isCompletedRow && evaluatedRows[rowIndex]) {
          letters = evaluatedRows[rowIndex].map(item => item.char);
          statuses = evaluatedRows[rowIndex].map(item => item.status);
        } else if (isCurrentRow) {
          const chars = currentGuess.split('');
          letters = [chars[0] || '', chars[1] || '', chars[2] || '', chars[3] || '', chars[4] || ''];
          statuses = letters.map(c => (c ? 'tbd' : 'empty'));
        }

        const isRowShaking = isCurrentRow && isInvalidShake && !reducedMotion;

        return (
          <div
            key={rowIndex}
            className={`flex items-center gap-1.5 sm:gap-2 ${isRowShaking ? 'animate-row-shake' : ''}`}
            role="row"
            aria-label={`Row ${rowIndex + 1}`}
          >
            {letters.map((letter, colIndex) => {
              const isNewlyTyped = isCurrentRow && colIndex === currentGuess.length - 1 && letter !== '';

              return (
                <Tile
                  key={colIndex}
                  letter={letter}
                  status={statuses[colIndex]}
                  positionIndex={colIndex}
                  isFlipping={isFlippingRow}
                  isBounce={isWinningRow}
                  isPop={isNewlyTyped}
                  highContrast={highContrast}
                  reducedMotion={reducedMotion}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
