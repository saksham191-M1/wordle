import React from 'react';
import { X, Moon, Sun, Volume2, VolumeX, Eye, ShieldAlert } from 'lucide-react';
import { GameSettings } from '../types/game.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  isGameInProgress: boolean;
  onResetPracticeStats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isGameInProgress,
  onResetPracticeStats,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
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

        <h2 id="settings-modal-title" className="text-xl font-bold tracking-tight mb-5">
          Settings
        </h2>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
          {/* Hard Mode Toggle */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-semibold block text-slate-900 dark:text-slate-100">
                Hard Mode
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Any revealed hints must be used in subsequent guesses
              </span>
              {isGameInProgress && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block mt-1 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Can only be toggled at start of a round
                </span>
              )}
            </div>
            <button
              disabled={isGameInProgress}
              onClick={() => onUpdateSettings({ hardMode: !settings.hardMode })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.hardMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              } ${isGameInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
              role="switch"
              aria-checked={settings.hardMode}
              aria-label="Toggle Hard Mode"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.hardMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-semibold block text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Theme
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                {settings.theme === 'dark' ? 'Obsidian Dark' : 'Gallery Light'}
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.theme === 'dark' ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={settings.theme === 'dark'}
              aria-label="Toggle Theme"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* High Contrast Mode */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-semibold block text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                High Contrast Mode
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                For improved color vision (orange & sky blue)
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ highContrast: !settings.highContrast })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.highContrast ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={settings.highContrast}
              aria-label="Toggle High Contrast Mode"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.highContrast ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Sound Effects */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-semibold block text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Sound Feedback
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Tactile keystrokes, flips, and chimes
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.soundEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={settings.soundEnabled}
              aria-label="Toggle Sound"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-semibold block text-slate-900 dark:text-slate-100">
                Reduced Motion
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Disable 3D flips, shakes, and bounce effects
              </span>
            </div>
            <button
              onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.reducedMotion ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              role="switch"
              aria-checked={settings.reducedMotion}
              aria-label="Toggle Reduced Motion"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.reducedMotion ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Practice Stats Reset */}
          <div className="pt-4 flex items-center justify-between">
            <div>
              <span className="font-semibold block text-slate-900 dark:text-slate-100">
                Reset Practice Stats
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                Clear practice wins and streak history
              </span>
            </div>
            <button
              onClick={onResetPracticeStats}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/40 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
