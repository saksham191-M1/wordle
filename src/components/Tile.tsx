import React, { useEffect, useState } from 'react';
import { LetterStatus } from '../types/game.ts';

interface TileProps {
  letter: string;
  status: LetterStatus;
  positionIndex: number;
  isFlipping?: boolean;
  isBounce?: boolean;
  isPop?: boolean;
  highContrast?: boolean;
  reducedMotion?: boolean;
}

export const Tile: React.FC<TileProps> = ({
  letter,
  status,
  positionIndex,
  isFlipping = false,
  isBounce = false,
  isPop = false,
  highContrast = false,
  reducedMotion = false,
}) => {
  // During 3D flip animation, we change color halfway through the rotation
  const [revealedStatus, setRevealedStatus] = useState<LetterStatus>(
    isFlipping ? 'tbd' : status
  );

  useEffect(() => {
    if (!isFlipping || reducedMotion) {
      setRevealedStatus(status);
      return;
    }

    // Halfway through 250ms flip, swap to target color
    const timer = setTimeout(() => {
      setRevealedStatus(status);
    }, 125);

    return () => clearTimeout(timer);
  }, [isFlipping, status, reducedMotion]);

  // Determine colors based on status and high contrast setting
  const getStyleClasses = () => {
    if (revealedStatus === 'correct') {
      return highContrast
        ? 'bg-orange-500 border-orange-500 text-white font-bold'
        : 'bg-emerald-600 border-emerald-600 text-white font-bold';
    }
    if (revealedStatus === 'present') {
      return highContrast
        ? 'bg-sky-500 border-sky-500 text-white font-bold'
        : 'bg-amber-500 border-amber-500 text-white font-bold';
    }
    if (revealedStatus === 'absent') {
      return 'bg-slate-500 dark:bg-slate-700 border-slate-500 dark:border-slate-700 text-white font-bold';
    }
    if (letter) {
      return 'border-slate-400 dark:border-slate-500 text-slate-900 dark:text-slate-100 font-bold bg-white dark:bg-slate-900';
    }
    return 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 bg-white/40 dark:bg-slate-900/40';
  };

  const flipDelay = `${positionIndex * 150}ms`;
  const bounceDelay = `${positionIndex * 100}ms`;

  const ariaDescription = () => {
    if (!letter) return 'empty tile';
    if (revealedStatus === 'correct') return `${letter}, correct spot`;
    if (revealedStatus === 'present') return `${letter}, in word but wrong spot`;
    if (revealedStatus === 'absent') return `${letter}, not in word`;
    return `${letter}`;
  };

  return (
    <div
      className="perspective-tile w-12 h-12 sm:w-14 sm:h-14 md:w-15 md:h-15 flex items-center justify-center select-none"
      role="img"
      aria-label={ariaDescription()}
    >
      <div
        className={`w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-extrabold uppercase border-2 rounded-lg transition-colors duration-200 ${getStyleClasses()} ${
          isPop && !reducedMotion ? 'animate-tile-pop' : ''
        }`}
        style={{
          animationDelay: isBounce ? bounceDelay : flipDelay,
          animation: isFlipping && !reducedMotion
            ? `tile-flip 300ms ease-in-out ${flipDelay} forwards`
            : isBounce && !reducedMotion
            ? `tile-bounce 900ms cubic-bezier(0.28, 0.84, 0.42, 1) ${bounceDelay} forwards`
            : undefined,
        }}
      >
        {letter}
      </div>
    </div>
  );
};
