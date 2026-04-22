'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  autoplayAudio: boolean;
  setAutoplayAudio: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'audible-slides-settings';

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [autoplayAudio, setAutoplayAudioState] = useState(readStoredAutoplayAudio);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      const settings = {
        autoplayAudio,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [autoplayAudio]);

  const setAutoplayAudio = (value: boolean) => {
    setAutoplayAudioState(value);
  };

  const value = {
    autoplayAudio,
    setAutoplayAudio,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

function readStoredAutoplayAudio(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const settings = JSON.parse(stored) as { autoplayAudio?: boolean };
    return settings.autoplayAudio ?? false;
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return false;
  }
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
