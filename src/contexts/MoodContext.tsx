import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface MoodContextType {
  mood: string | null;
  setMood: (moodId: string) => void;
  clearMood: () => void;
  frozen: boolean;
  freezeMood: () => void;
  unfreezeMood: () => void;
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

  const [frozen, setFrozen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mood_frozen') === '1';
    } catch {
      return false;
    }
  });

  const [frozenMood, setFrozenMood] = useState<string | null>(() => {
    try {
      return localStorage.getItem('frozen_mood');
    } catch {
      return null;
    }
  });

  const themeMood = frozen ? frozenMood : mood;

  useEffect(() => {
    applyTheme(themeMood);
  }, [themeMood]);

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

  const freezeMood = useCallback(() => {
    setFrozenMood(mood);
    setFrozen(true);
    try {
      localStorage.setItem('mood_frozen', '1');
      if (mood) localStorage.setItem('frozen_mood', mood);
      else localStorage.removeItem('frozen_mood');
    } catch {}
  }, [mood]);

  const unfreezeMood = useCallback(() => {
    setFrozen(false);
    try {
      localStorage.removeItem('mood_frozen');
    } catch {}
  }, []);

  return (
    <MoodContext.Provider value={{ mood, setMood, clearMood, frozen, freezeMood, unfreezeMood }}>
      {children}
    </MoodContext.Provider>
  );
}

export function useMood(): MoodContextType {
  const context = useContext(MoodContext);
  if (!context) throw new Error('useMood must be used within a MoodProvider');
  return context;
}
