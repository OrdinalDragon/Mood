import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface MoodContextType {
  mood: string | null;
  setMood: (moodId: string) => void;
  clearMood: () => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

const VALID_MOODS = ['alegre', 'triste', 'enojado', 'abrumado', 'reservado'];

function applyTheme(mood: string | null) {
  if (mood && VALID_MOODS.includes(mood)) {
    document.documentElement.setAttribute('data-mood', mood);
  } else {
    document.documentElement.removeAttribute('data-mood');
  }
}

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [mood, setMoodState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('mood');
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
