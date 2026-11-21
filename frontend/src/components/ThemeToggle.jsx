import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../ThemeContext';

/**
 * Small round theme toggle button for switching between Dark and Light mode.
 * Styled with circular silhouette, subtle border, smooth hover transitions and accessible aria attributes.
 */
export default function ThemeToggle({ className = '', size = 'normal' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses = size === 'small' 
    ? 'w-8 h-8' 
    : 'w-8.5 h-8.5 sm:w-9 sm:h-9';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs focus-visible:outline-2 focus-visible:outline-[#0A7CB3] active:scale-92 shrink-0 ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700/90 text-amber-300 border border-slate-700 hover:border-slate-600'
          : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
      } ${sizeClasses} ${className}`}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-300 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
