import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { settingsApi, type UpdateSettingsPayload } from '../api/settings';
import type { StoreSettings } from '../types';
import { useAuth } from './AuthContext';

interface SettingsContextValue {
  settings: StoreSettings | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateSettings: (patch: UpdateSettingsPayload) => Promise<StoreSettings>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// La configuración vive en el backend (tabla store_settings, registro único).
// Se carga una vez que hay sesión iniciada y se comparte entre todas las
// pantallas (POS, Configuración, etc.) sin volver a pedirla a cada rato.
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setSettings(await settingsApi.get());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setSettings(null);
      setIsLoading(false);
    }
  }, [user, refresh]);

  const updateSettings = useCallback(async (patch: UpdateSettingsPayload) => {
    const updated = await settingsApi.update(patch);
    setSettings(updated);
    return updated;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refresh, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings debe usarse dentro de <SettingsProvider>');
  return ctx;
}
