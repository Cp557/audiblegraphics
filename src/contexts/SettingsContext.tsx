'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsContextType {
  geminiApiKey: string;
  setGeminiApiKey: (value: string) => void;
  clearGeminiApiKey: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (value: boolean) => void;
  requireGeminiApiKey: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const API_KEY_STORAGE_KEY = 'audiblegraphics-gemini-api-key';

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [geminiApiKey, setGeminiApiKeyState] = useState(readStoredApiKey);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const setGeminiApiKey = (value: string) => {
    const trimmedValue = value.trim();
    setGeminiApiKeyState(trimmedValue);
    try {
      if (trimmedValue) {
        window.sessionStorage.setItem(API_KEY_STORAGE_KEY, trimmedValue);
      } else {
        window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save the Gemini API key for this tab:', error);
    }
  };

  const clearGeminiApiKey = () => setGeminiApiKey('');

  const requireGeminiApiKey = () => {
    setSettingsOpen(true);
  };

  const value = {
    geminiApiKey,
    setGeminiApiKey,
    clearGeminiApiKey,
    settingsOpen,
    setSettingsOpen,
    requireGeminiApiKey,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

function readStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
