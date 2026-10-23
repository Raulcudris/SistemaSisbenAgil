'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Canal, KioskConfig, Persona, Servicio, Ticket } from './types';

export interface KioskState {
  config: KioskConfig | null;
  canal: Canal;
  persona: Persona | null;
  cedulaPendiente: string | null;
  servicio: Servicio | null;
  nivel: string | null;
  ticket: Ticket | null;
}

const ESTADO_INICIAL: KioskState = {
  config: null,
  canal: 'TURNO',
  persona: null,
  cedulaPendiente: null,
  servicio: null,
  nivel: null,
  ticket: null,
};

const CLAVE = 'sisbenagil.kiosk.v1';

interface KioskContextValue {
  state: KioskState;
  hydrated: boolean;
  update: (patch: Partial<KioskState>) => void;
  reset: () => void;
}

const KioskContext = createContext<KioskContextValue | null>(null);

export function KioskProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KioskState>(ESTADO_INICIAL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CLAVE);
      if (raw) {
        setState({ ...ESTADO_INICIAL, ...(JSON.parse(raw) as Partial<KioskState>) });
      }
    } catch {
      // sessionStorage no disponible o JSON corrupto: se usa el estado inicial
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(state));
    } catch {
      // sin persistencia: el flujo sigue funcionando en memoria
    }
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<KioskState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setState(ESTADO_INICIAL), []);

  const value = useMemo(
    () => ({ state, hydrated, update, reset }),
    [state, hydrated, update, reset],
  );

  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export function useKiosk(): KioskContextValue {
  const context = useContext(KioskContext);
  if (!context) {
    throw new Error('useKiosk debe usarse dentro de KioskProvider');
  }
  return context;
}
