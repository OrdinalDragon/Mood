import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface MoodContextType {
  mood: string | null;
  setMood: (moodId: string) => void;
  clearMood: () => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

const VALID_MOODS = ['alegre', 'triste', 'enojado', 'tranquilo', 'reservado'];

const MOOD_ALIASES: Record<string, string> = {
  abrumado: 'tranquilo',
};

function applyTheme(mood: string | null) {
  const resolved = (mood && MOOD_ALIASES[mood]) || mood;
  if (resolved && VALID_MOODS.includes(resolved)) {
    document.documentElement.setAttribute('data-mood', resolved);
  } else {
    document.documentElement.removeAttribute('data-mood');
  }
}

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMoodState] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('mood');
      return stored === 'abrumado' ? 'tranquilo' : stored;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    applyTheme(mood);
  }, [mood]);

  const setMood = useCallback((moodId: string) => {
    setMoodState(moodId);
    try {
      localStorage.setItem('mood', moodId);
    } catch {}
  }, []);

  const clearMood = useCallback(() => {
    setMoodState(null);
    try {
      localStorage.removeItem('mood');
    } catch {}
  }, []);

  return (
    <MoodContext.Provider value={{ mood, setMood, clearMood }}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood(): MoodContextType {
  const context = useContext(MoodContext);
  if (!context) throw new Error('useMood must be used within a MoodProvider');
  return context;
}
