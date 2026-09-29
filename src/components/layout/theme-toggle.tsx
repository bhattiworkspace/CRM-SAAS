'use client';

import * as React from 'react';
import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-1">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-sm transition-colors ${theme === 'light' ? 'bg-slate-100 text-brand-600 dark:bg-slate-800' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        title="Light Mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-sm transition-colors ${theme === 'dark' ? 'bg-slate-100 text-brand-600 dark:bg-slate-800' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        title="Dark Mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('theme-orange')}
        className={`p-1.5 rounded-sm transition-colors ${theme === 'theme-orange' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : 'text-slate-400 hover:text-orange-500'}`}
        title="Orange Theme"
      >
        <Palette className="h-4 w-4" />
      </button>
    </div>
  );
}
