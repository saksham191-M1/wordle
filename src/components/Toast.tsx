import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 font-bold text-sm px-4 py-2.5 rounded-lg shadow-xl backdrop-blur-xs border border-slate-700/50 dark:border-slate-300/50 animate-bounce">
        {message}
      </div>
    </div>
  );
};
