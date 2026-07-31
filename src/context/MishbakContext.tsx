'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type MishbakMood = 'happy' | 'neutral' | 'thinking' | 'excited' | 'celebrating' | 'encouraging';

interface MishbakContextType {
  setMood: (mood: MishbakMood, duration?: number) => void;
  showMessage: (message: string, mood?: MishbakMood, duration?: number) => void;
}

export const MishbakContext = createContext<MishbakContextType | undefined>(undefined);

export function MishbakProvider({ children }: { children: ReactNode }) {
  const [currentMood, setCurrentMood] = useState<MishbakMood>('neutral');
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  const setMood = useCallback((mood: MishbakMood, duration: number = 3000) => {
    setCurrentMood(mood);
    setTimeout(() => {
      setCurrentMood('neutral'); // العودة للحالة الطبيعية بعد المدة
    }, duration);
  }, []);

  const showMessage = useCallback((message: string, mood: MishbakMood = 'happy', duration: number = 4000) => {
    setCustomMessage(message);
    setCurrentMood(mood);
    setTimeout(() => {
      setCustomMessage(null);
      setCurrentMood('neutral');
    }, duration);
  }, []);

  return (
    <MishbakContext.Provider value={{ setMood, showMessage }}>
      {children}
    </MishbakContext.Provider>
  );
}

export function useMishbak() {
  const context = useContext(MishbakContext);
  if (!context) {
    throw new Error('useMishbak must be used within a MishbakProvider');
  }
  return context;
}