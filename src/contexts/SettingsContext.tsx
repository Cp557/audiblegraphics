'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  autoplayAudio: boolean;
  autoSwitchSlide: boolean;
  setAutoplayAudio: (value: boolean) => void;
  setAutoSwitchSlide: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'audible-slides-settings';

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [autoplayAudio, setAutoplayAudioState] = useState(false);
  const [autoSwitchSlide, setAutoSwitchSlideState] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        setAutoplayAudioState(settings.autoplayAudio ?? false);
        setAutoSwitchSlideState(settings.autoSwitchSlide ?? false);
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return;

    try {
      const settings = {
        autoplayAudio,
        autoSwitchSlide,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [autoplayAudio, autoSwitchSlide, isInitialized]);

  const setAutoplayAudio = (value: boolean) => {
    setAutoplayAudioState(value);
  };

  const setAutoSwitchSlide = (value: boolean) => {
    setAutoSwitchSlideState(value);
  };

  const value = {
    autoplayAudio,
    autoSwitchSlide,
    setAutoplayAudio,
    setAutoSwitchSlide,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
