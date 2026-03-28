'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center text-text-main shadow-sm hover:shadow-md transition-all">
        <span className="material-symbols-rounded text-xl">light_mode</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center text-text-main shadow-sm hover:shadow-md transition-all"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <span className="material-symbols-rounded text-xl">light_mode</span> : <span className="material-symbols-rounded text-xl">dark_mode</span>}
    </button>
  );
}
