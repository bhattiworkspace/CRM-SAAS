'use client';

import * as React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { clsx } from 'clsx';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="hidden sm:flex items-center gap-1 bg-surf2 border border-line rounded p-0.5" role="group" aria-label="Theme">
      <button
        onClick={() => setTheme('light')}
        className={clsx('theme-btn', (theme === 'light' || (!theme && resolvedTheme === 'light')) && 'active')}
        aria-pressed={theme === 'light'}
        title="Light"
      >
        <Sun className="ic" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={clsx('theme-btn', theme === 'dark' && 'active')}
        aria-pressed={theme === 'dark'}
        title="Dark"
      >
        <Moon className="ic" />
      </button>
      <button
        onClick={() => setTheme('accent')}
        className={clsx('theme-btn', theme === 'accent' && 'active')}
        aria-pressed={theme === 'accent'}
        title="Accent"
      >
        <Palette className="ic" />
      </button>
    </div>
  );
}
