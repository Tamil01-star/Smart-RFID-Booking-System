import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppSettings, SystemMode } from '../types';

interface AppContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleSystemMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
  systemMode: 'hardware',
  esp32Connected: true,
  firebaseConnected: true,
  demoRFIDUid: '',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('smartbus_settings');
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('smartbus_settings', JSON.stringify(next));
      return next;
    });
  };

  const toggleSystemMode = () => {
    updateSettings({
      systemMode: settings.systemMode === 'demo' ? 'hardware' : 'demo',
    });
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, toggleSystemMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
