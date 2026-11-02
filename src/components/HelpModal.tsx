import React from 'react';
import { X } from 'lucide-react';
import { GameSettings } from '../types/game.ts';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, settings }) => {
  if (!isOpen) return null;

  const correctBg = settings.highContrast ? 'bg-orange-500' : 'bg-emerald-600';
  const presentBg = settings.highContrast ? 'bg-sky-500' : 'bg-amber-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="help-modal-title" className="text-xl font-bold tracking-tight mb-2">
          How to Play
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          Guess the hidden <span className="font-semibold text-slate-900 dark:text-white">5-letter word</span> in 6 tries.
        </p>

        <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 mb-6 list-disc list-inside">
          <li>Each guess must be a valid 5-letter English word.</li>
          <li>Hit <span className="font-semibold text-slate-900 dark:text-white">Enter</span> to submit your guess.</li>
          <li>After each guess, the tile colors will change to show how close your guess was to the target word.</li>
        </ul>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Examples
          </h3>

          {/* Example 1: Green */}
          <div className="mb-4">
            <div className="flex gap-1.5 mb-1.5">
              <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-white text-base ${correctBg}`}>
                W
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                E
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                A
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                R
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                Y
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">W</span> is in the word and in the correct spot.
            </p>
          </div>

          {/* Example 2: Yellow */}
          <div className="mb-4">
            <div className="flex gap-1.5 mb-1.5">
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                P
              </div>
              <div className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-white text-base ${presentBg}`}>
                I
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                L
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                L
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                S
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">I</span> is in the word but in the wrong spot.
            </p>
          </div>

          {/* Example 3: Gray */}
          <div className="mb-4">
            <div className="flex gap-1.5 mb-1.5">
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                V
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                A
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                G
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-white text-base bg-slate-500 dark:bg-slate-700">
                U
              </div>
              <div className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 text-base">
                E
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">U</span> is not in the word in any spot.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p><span className="font-semibold text-slate-700 dark:text-slate-300">Daily Challenge:</span> A new synchronized puzzle every day at midnight.</p>
          <p><span className="font-semibold text-slate-700 dark:text-slate-300">Unlimited Practice:</span> Play infinite rounds whenever you want.</p>
        </div>
      </div>
    </div>
  );
};
