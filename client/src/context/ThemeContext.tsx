import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Sun, Moon } from 'lucide-react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('score_master_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [transitionState, setTransitionState] = useState<{
    isTransitioning: boolean;
    targetTheme: Theme | null;
    isFadingOut: boolean;
  }>({
    isTransitioning: false,
    targetTheme: null,
    isFadingOut: false,
  });

  const applyThemeClasses = (targetTheme: Theme) => {
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeClasses(newTheme);
    try {
      localStorage.setItem('score_master_theme', newTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    if (transitionState.isTransitioning) return;

    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';

    // Start loader overlay
    setTransitionState({
      isTransitioning: true,
      targetTheme: nextTheme,
      isFadingOut: false,
    });

    // At 1.6s, change actual theme state & start fade out
    setTimeout(() => {
      setTheme(nextTheme);
      setTransitionState(prev => ({ ...prev, isFadingOut: true }));
    }, 1600);

    // At 2.0s, finish transition & hide overlay
    setTimeout(() => {
      setTransitionState({
        isTransitioning: false,
        targetTheme: null,
        isFadingOut: false,
      });
    }, 2000);
  };

  useEffect(() => {
    applyThemeClasses(theme);
  }, []);

  const targetTheme = transitionState.targetTheme || (theme === 'dark' ? 'light' : 'dark');
  const isTargetLight = targetTheme === 'light';

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isTransitioning: transitionState.isTransitioning,
      }}
    >
      {children}

      {/* 2-Second Catchy Theme Switcher Overlay Loader */}
      {transitionState.isTransitioning && (
        <ThemeLoaderOverlay
          isTargetLight={isTargetLight}
          isFadingOut={transitionState.isFadingOut}
        />
      )}
    </ThemeContext.Provider>
  );
}

function ThemeLoaderOverlay({
  isTargetLight,
  isFadingOut,
}: {
  isTargetLight: boolean;
  isFadingOut: boolean;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setProgress(100);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-400 ease-in-out select-none backdrop-blur-md ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      } ${
        isTargetLight
          ? 'bg-gradient-to-br from-sky-100 via-white to-amber-50 text-slate-900'
          : 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-slate-100'
      }`}
    >
      {/* Animated Glow Halo */}
      <div className="relative flex items-center justify-center mb-6">
        <div
          className={`absolute w-36 h-36 rounded-full blur-2xl animate-pulse ${
            isTargetLight ? 'bg-amber-400/40' : 'bg-blue-500/30'
          }`}
        />
        {/* Spinning/Pulse Badge Icon Container */}
        <div
          className={`relative z-10 w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl border transition-all duration-300 transform animate-bounce ${
            isTargetLight
              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white border-amber-300/60 shadow-amber-500/30'
              : 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-blue-400/40 shadow-blue-600/40'
          }`}
        >
          {isTargetLight ? (
            <Sun size={48} className="animate-spin-slow" />
          ) : (
            <Moon size={48} className="animate-pulse" />
          )}
        </div>
      </div>

      {/* Mode Text */}
      <div className="text-center space-y-2 px-6">
        <h2 className="text-2xl font-black tracking-tight flex items-center justify-center gap-2">
          <span>Switching to {isTargetLight ? 'Light' : 'Dark'} Mode</span>
        </h2>
      </div>

      {/* Progress bar line: 0% -> 50% at 1s -> 100% at 2s */}
      <div className="w-48 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-6 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-2000 ease-linear ${
            isTargetLight ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
