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
import type { LoginResponse, SesionResponse, UsuarioSesion, Ventanilla } from './types';

interface AuthState {
  token: string | null;
  usuario: UsuarioSesion | null;
  ventanillas: Ventanilla[];
  ventanillaId: number | null;
  /** El asesor elige su ventanilla una sola vez y no puede cambiarla. */
  ventanillaBloqueada: boolean;
}

const ESTADO_INICIAL: AuthState = {
  token: null,
  usuario: null,
  ventanillas: [],
  ventanillaId: null,
  ventanillaBloqueada: false,
};

const CLAVE = 'sisbenagil.auth.v1';

interface AuthContextValue extends AuthState {
  hydrated: boolean;
  iniciarSesion: (respuesta: LoginResponse) => void;
  actualizarSesion: (respuesta: SesionResponse) => void;
  cerrarSesion: () => void;
  seleccionarVentanilla: (ventanillaId: number | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(ESTADO_INICIAL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) {
        setState({ ...ESTADO_INICIAL, ...(JSON.parse(raw) as Partial<AuthState>) });
      }
    } catch {
      // localStorage no disponible o JSON corrupto: se usa el estado inicial.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      if (state.token) {
        localStorage.setItem(CLAVE, JSON.stringify(state));
      } else {
        localStorage.removeItem(CLAVE);
      }
    } catch {
      // sin persistencia: la sesión sigue funcionando en memoria.
    }
  }, [state, hydrated]);

  const iniciarSesion = useCallback((respuesta: LoginResponse) => {
    const esAdmin = respuesta.usuario.rol === 'ADMIN';
    setState({
      token: respuesta.token,
      usuario: respuesta.usuario,
      ventanillas: respuesta.ventanillas,
      // El asesor debe elegir su ventanilla; el admin toma la primera.
      ventanillaId: esAdmin ? respuesta.ventanillas[0]?.id ?? null : null,
      ventanillaBloqueada: false,
    });
  }, []);

  const actualizarSesion = useCallback((respuesta: SesionResponse) => {
    setState((prev) => ({
      ...prev,
      usuario: respuesta.usuario,
      ventanillas: respuesta.ventanillas,
    }));
  }, []);

  const cerrarSesion = useCallback(() => {
    setState(ESTADO_INICIAL);
  }, []);

  const seleccionarVentanilla = useCallback((ventanillaId: number | null) => {
    setState((prev) => {
      if (prev.ventanillaBloqueada) {
        return prev;
      }
      const bloquear = prev.usuario?.rol === 'ASESOR' && ventanillaId !== null;
      return { ...prev, ventanillaId, ventanillaBloqueada: bloquear };
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      hydrated,
      iniciarSesion,
      actualizarSesion,
      cerrarSesion,
      seleccionarVentanilla,
    }),
    [
      state,
      hydrated,
      iniciarSesion,
      actualizarSesion,
      cerrarSesion,
      seleccionarVentanilla,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
