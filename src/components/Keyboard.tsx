import React from 'react';
import { Delete } from 'lucide-react';

interface KeyboardProps {
  onChar: (char: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  keyStatuses: Record<string, 'correct' | 'present' | 'absent'>;
  disabled?: boolean;
  highContrast?: boolean;
}

const ROW_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const ROW_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
const ROW_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

export const Keyboard: React.FC<KeyboardProps> = ({
  onChar,
  onEnter,
  onDelete,
  keyStatuses,
  disabled = false,
  highContrast = false,
}) => {
  const getKeyClass = (key: string) => {
    const status = keyStatuses[key];

    if (status === 'correct') {
      return highContrast
        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-xs'
        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs';
    }
    if (status === 'present') {
      return highContrast
        ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-xs'
        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs';
    }
    if (status === 'absent') {
      return 'bg-slate-400 dark:bg-slate-800/80 text-white/80 dark:text-slate-400 opacity-80';
    }
    return 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs';
  };

  return (
    <div
      className="w-full max-w-lg mx-auto flex flex-col items-center gap-1.5 sm:gap-2 px-1 sm:px-2 select-none pb-3 sm:pb-5"
      role="group"
      aria-label="Keyboard"
    >
      {/* Row 1 */}
      <div className="flex justify-center gap-1 sm:gap-1.5 w-full">
        {ROW_1.map(key => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChar(key)}
            className={`key-press-effect flex-1 h-12 sm:h-14 max-w-10 sm:max-w-12 rounded-md sm:rounded-lg font-bold text-sm sm:text-base flex items-center justify-center transition-all ${getKeyClass(
              key
            )}`}
            aria-label={`Letter ${key}, ${keyStatuses[key] || 'unused'}`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Row 2 */}
      <div className="flex justify-center gap-1 sm:gap-1.5 w-full px-2 sm:px-4">
        {ROW_2.map(key => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChar(key)}
            className={`key-press-effect flex-1 h-12 sm:h-14 max-w-10 sm:max-w-12 rounded-md sm:rounded-lg font-bold text-sm sm:text-base flex items-center justify-center transition-all ${getKeyClass(
              key
            )}`}
            aria-label={`Letter ${key}, ${keyStatuses[key] || 'unused'}`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Row 3: Enter + Letters + Backspace */}
      <div className="flex justify-center gap-1 sm:gap-1.5 w-full">
        <button
          type="button"
          disabled={disabled}
          onClick={onEnter}
          className="key-press-effect px-2 sm:px-3 h-12 sm:h-14 min-w-[50px] sm:min-w-[65px] rounded-md sm:rounded-lg font-bold text-xs sm:text-sm tracking-wide bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center transition-all shadow-xs"
          aria-label="Submit guess"
        >
          ENTER
        </button>

        {ROW_3.map(key => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChar(key)}
            className={`key-press-effect flex-1 h-12 sm:h-14 max-w-10 sm:max-w-12 rounded-md sm:rounded-lg font-bold text-sm sm:text-base flex items-center justify-center transition-all ${getKeyClass(
              key
            )}`}
            aria-label={`Letter ${key}, ${keyStatuses[key] || 'unused'}`}
          >
            {key}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="key-press-effect px-2 sm:px-3 h-12 sm:h-14 min-w-[50px] sm:min-w-[65px] rounded-md sm:rounded-lg font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center transition-all shadow-xs"
          aria-label="Delete letter"
        >
          <Delete className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
    </div>
  );
};
