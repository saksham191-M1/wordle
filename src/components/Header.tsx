import React from 'react';
import { HelpCircle, BarChart3, Settings, Volume2, VolumeX, Sparkles, Sun, Moon, Users } from 'lucide-react';
import { GameMode, GameSettings } from '../types/game.ts';

interface HeaderProps {
  mode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  dayIndex: number;
  settings: GameSettings;
  onToggleSound: () => void;
  onToggleTheme: () => void;
  onOpenHelp: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenMultiplayer: () => void;
  inRoomCode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onSelectMode,
  dayIndex,
  settings,
  onToggleSound,
  onToggleTheme,
  onOpenHelp,
  onOpenStats,
  onOpenSettings,
  onOpenMultiplayer,
  inRoomCode,
}) => {
  return (
    <header className="w-full max-w-xl mx-auto flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Zone 1: Brand & Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 dark:from-emerald-500 dark:to-teal-300 flex items-center justify-center text-slate-950 font-black text-lg shadow-sm">
          L
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-none">
            LexiCraft
            {settings.hardMode && (
              <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 tracking-wide uppercase">
                HARD
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {mode === 'daily'
              ? `Daily #${dayIndex}`
              : mode === 'multiplayer'
              ? inRoomCode
                ? `Room: ${inRoomCode}`
                : 'Multiplayer Room'
              : 'Unlimited Practice'}
          </span>
        </div>
      </div>

      {/* Zone 2: Mode Toggle */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => onSelectMode('daily')}
          className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
            mode === 'daily'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Switch to Daily Challenge"
        >
          Daily
        </button>
        <button
          onClick={() => onSelectMode('practice')}
          className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
            mode === 'practice'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Switch to Practice Mode"
        >
          <Sparkles className="w-3 h-3" />
          <span className="hidden sm:inline">Practice</span>
        </button>
        <button
          onClick={onOpenMultiplayer}
          className={`px-2 sm:px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
            mode === 'multiplayer'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Multiplayer Rooms"
        >
          <Users className="w-3 h-3" />
          Multiplayer
        </button>
      </div>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-1 shrink-0 text-slate-600 dark:text-slate-400">
        <button
          onClick={onToggleSound}
          className="p-1.5 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-md transition-colors"
          title={settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
          aria-label={settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>

        <button
          onClick={onToggleTheme}
          className="p-1.5 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-md transition-colors"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenHelp}
          className="p-1.5 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-md transition-colors"
          title="How to play"
          aria-label="How to play"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenStats}
          className="p-1.5 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-md transition-colors"
          title="Statistics"
          aria-label="Statistics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-md transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
