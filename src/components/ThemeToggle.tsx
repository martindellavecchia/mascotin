'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button aria-label="Cambiar tema" className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-text-main transition-colors hover:bg-muted dark:border-border-dark dark:bg-surface-dark">
        <Sun className="size-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-text-main transition-colors hover:bg-muted dark:border-border-dark dark:bg-surface-dark"
      aria-label="Cambiar tema"
    >
      {theme === 'dark' ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
    </button>
  );
}
