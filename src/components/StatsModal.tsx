import React, { useEffect, useState } from 'react';
import { X, Share2, Check, RotateCcw, BookOpen, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { GameMode, GameStatus, UserStats } from '../types/game.ts';
import { fetchWordDefinition, WordDefinition } from '../utils/definition.ts';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  gameStatus: GameStatus;
  mode: GameMode;
  targetWord: string;
  guessCount: number;
  gameDuration?: number | null;
  onShare: () => void;
  onPlayAgainPractice?: () => void;
  isCopied: boolean;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  gameStatus,
  mode,
  targetWord,
  guessCount,
  gameDuration,
  onShare,
  onPlayAgainPractice,
  isCopied,
}) => {
  const [countdown, setCountdown] = useState<string>('');
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [showDefinition, setShowDefinition] = useState<boolean>(false);
  const [loadingDef, setLoadingDef] = useState<boolean>(false);

  // Fetch definition when game ends
  useEffect(() => {
    if (!isOpen || (gameStatus !== 'WON' && gameStatus !== 'LOST')) return;
    setLoadingDef(true);
    fetchWordDefinition(targetWord)
      .then(def => {
        setDefinition(def);
        setLoadingDef(false);
      })
      .catch(() => setLoadingDef(false));
  }, [isOpen, gameStatus, targetWord]);

  // Midnight countdown for Daily Challenge
  useEffect(() => {
    if (!isOpen) return;

    const updateCountdown = () => {
      const now = new Date();
      const nextUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      const diffMs = Math.max(0, nextUtcMidnight - now.getTime());

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const winPercentage = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const averageTimeSeconds =
    stats.played > 0 && stats.totalTimeSeconds ? Math.round(stats.totalTimeSeconds / stats.played) : 0;
  const maxGuessesInDist = Math.max(...Object.values(stats.guessDistribution), 1);
  const isGameOver = gameStatus === 'WON' || gameStatus === 'LOST';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="stats-modal-title" className="text-xl font-bold tracking-tight text-center mb-4">
          {mode === 'daily' ? 'Daily Statistics' : 'Practice Statistics'}
        </h2>

        {/* Word Reveal on Game Over */}
        {isGameOver && (
          <div className="mb-5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {gameStatus === 'WON' ? 'Splendid!' : 'The correct word was'}
            </span>
            <span className="text-2xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              {targetWord}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {gameStatus === 'WON' ? (
                <>
                  Solved in {guessCount} {guessCount === 1 ? 'try' : 'tries'}
                  {gameDuration ? ` · ${formatDuration(gameDuration)}` : ''}
                </>
              ) : (
                gameDuration ? `Time taken: ${formatDuration(gameDuration)}` : ''
              )}
            </p>

            {/* Word Definition Toggle */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/50">
              <button
                type="button"
                onClick={() => setShowDefinition(s => !s)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {showDefinition ? 'Hide Definition' : 'View Definition & Meaning'}
                {showDefinition ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showDefinition && (
                <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left text-xs leading-relaxed animate-in fade-in">
                  {loadingDef ? (
                    <p className="text-slate-400 italic">Looking up dictionary definition...</p>
                  ) : definition ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{definition.word}</span>
                        {definition.phonetic && (
                          <span className="text-slate-400 font-mono text-[11px]">{definition.phonetic}</span>
                        )}
                        <span className="italic text-slate-500 text-[11px]">({definition.partOfSpeech})</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{definition.definition}</p>
                      {definition.example && (
                        <p className="text-slate-500 italic border-l-2 border-emerald-500/40 pl-2 mt-1">
                          "{definition.example}"
                        </p>
                      )}
                      {definition.trivia && (
                        <p className="text-amber-600 dark:text-amber-400 font-medium text-[11px] mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          💡 {definition.trivia}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400">Definition unavailable.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4 Core Metrics */}
        <div className="grid grid-cols-4 gap-2 text-center mb-3">
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {stats.played}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Played</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {winPercentage}%
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Win Rate</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {stats.currentStreak}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Streak</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
              {stats.maxStreak}
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Max Streak</span>
          </div>
        </div>

        {/* Average Time Per Game Highlight Card */}
        <div className="mb-6 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Average Time Per Game</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
            {formatDuration(averageTimeSeconds)}
          </span>
        </div>

        {/* Guess Distribution */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Guess Distribution
          </h3>
          <div className="space-y-1.5">
            {([1, 2, 3, 4, 5, 6] as const).map(attempt => {
              const count = stats.guessDistribution[attempt] || 0;
              const percentage = Math.max(7, Math.round((count / maxGuessesInDist) * 100));
              const isCurrentWinRow = gameStatus === 'WON' && guessCount === attempt;

              return (
                <div key={attempt} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    {attempt}
                  </span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded h-5 overflow-hidden flex items-center">
                    <div
                      className={`h-full flex items-center justify-end px-2 font-bold tabular-nums text-[11px] transition-all duration-500 ${
                        isCurrentWinRow
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : count > 0
                          ? 'bg-slate-500 dark:bg-slate-700 text-white'
                          : 'bg-transparent text-slate-400'
                      }`}
                      style={{ width: `${percentage}%` }}
                    >
                      {count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons & Countdown */}
        {isGameOver && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-3">
            {mode === 'daily' ? (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="block font-medium">NEXT DAILY IN</span>
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                    {countdown}
                  </span>
                </div>
                <button
                  onClick={onShare}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      COPIED!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      SHARE
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={onShare}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      COPIED!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      SHARE
                    </>
                  )}
                </button>

                {onPlayAgainPractice && (
                  <button
                    onClick={onPlayAgainPractice}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    PLAY AGAIN
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
