'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BellRing,
  Expand,
  Monitor,
  RotateCcw,
  Ticket,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api, mensajeError } from '@/lib/api';
import type { TvLlamado, TvResumen } from '@/lib/types';

const POLL_MS = 3000;
const CLAVE_VOZ = 'sisbenagil.tv.voz';

const ESTILO_PRIORIDAD: Record<
  number,
  { badge: string; barra: string }
> = {
  1: { badge: 'bg-brand text-white', barra: 'bg-brand' },
  2: { badge: 'bg-slate-600 text-white', barra: 'bg-slate-400' },
  3: { badge: 'bg-amber-500 text-slate-950', barra: 'bg-amber-400' },
};

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function hora(date: Date): string {
  return `${dosDigitos(date.getHours())}:${dosDigitos(date.getMinutes())}:${dosDigitos(date.getSeconds())}`;
}

function fechaLarga(date: Date): string {
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function clave(t: TvLlamado): string {
  return `${t.turnoId}:${t.llamados}:${t.fechaLlamado}`;
}

/** Convierte "PR-001" en "prioritario 001" para que la voz lo pronuncie bien. */
function codigoHablado(codigo: string): string {
  return codigo
    .replace(/^PR-/i, 'prioritario ')
    .replace(/^GN-/i, 'general ')
    .replace(/^JR-/i, 'jurídico ')
    .replace(/-/g, ' ');
}

function estilo(prioridad: number) {
  return ESTILO_PRIORIDAD[prioridad] ?? ESTILO_PRIORIDAD[2];
}

export default function TvPage() {
  const [resumen, setResumen] = useState<TvResumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState<Date | null>(null);
  const [vozActiva, setVozActiva] = useState(true);
  const [audioListo, setAudioListo] = useState(false);
  const [preferenciaLeida, setPreferenciaLeida] = useState(false);
  const [soportado, setSoportado] = useState(true);

  const audioRef = useRef<AudioContext | null>(null);
  const vozRef = useRef(true);
  const audioListoRef = useRef(false);
  const vistosRef = useRef<Set<string>>(new Set());
  const inicializadoRef = useRef(false);
  const vocesRef = useRef<SpeechSynthesisVoice[]>([]);
  const resumenRef = useRef<TvResumen | null>(null);

  // El sonido queda activo por defecto y recuerda la preferencia del operador.
  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE_VOZ) === '0') {
        setVozActiva(false);
        vozRef.current = false;
      }
    } catch {
      // sin localStorage
    }
    setPreferenciaLeida(true);
  }, []);

  useEffect(() => {
    if (!preferenciaLeida) {
      return;
    }
    vozRef.current = vozActiva;
    try {
      localStorage.setItem(CLAVE_VOZ, vozActiva ? '1' : '0');
    } catch {
      // sin persistencia
    }
  }, [vozActiva, preferenciaLeida]);

  useEffect(() => {
    resumenRef.current = resumen;
  }, [resumen]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSoportado(false);
      return;
    }
    const cargarVoces = () => {
      vocesRef.current = window.speechSynthesis.getVoices();
    };
    cargarVoces();
    window.speechSynthesis.addEventListener('voiceschanged', cargarVoces);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', cargarVoces);
  }, []);

  // Reloj de la pantalla.
  useEffect(() => {
    const tick = () => setAhora(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /** Campana fuerte de dos tonos antes de cada anuncio. */
  const campana = useCallback(async () => {
    try {
      const ctx = audioRef.current ?? new window.AudioContext();
      audioRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const inicio = ctx.currentTime;
      [0, 0.3].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 0 ? 880 : 1175;
        gain.gain.setValueAtTime(0.0001, inicio + offset);
        gain.gain.exponentialRampToValueAtTime(0.85, inicio + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, inicio + offset + 0.26);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(inicio + offset);
        osc.stop(inicio + offset + 0.28);
      });
    } catch {
      // El navegador puede bloquear el audio hasta que haya interacción.
    }
  }, []);

  const hablar = useCallback((texto: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-CO';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voz = vocesRef.current.find((v) => v.lang.toLowerCase().startsWith('es'));
    if (voz) {
      utterance.voice = voz;
    }
    synth.speak(utterance);
  }, []);

  const anunciar = useCallback(
    async (llamados: TvLlamado[]) => {
      if (llamados.length === 0) {
        return;
      }
      await campana();
      llamados.forEach((turno) => {
        const codigo = codigoHablado(turno.codigo);
        hablar(
          `Turno ${codigo}. Pase a ${turno.ventanilla}. ` +
            `Repito, turno ${codigo}. Pase a ${turno.ventanilla}.`,
        );
      });
    },
    [campana, hablar],
  );

  const cargar = useCallback(async () => {
    try {
      const data = await api.tv();
      setResumen(data);
      setError(null);

      if (!inicializadoRef.current) {
        data.llamados.forEach((t) => vistosRef.current.add(clave(t)));
        inicializadoRef.current = true;
        return;
      }

      const nuevos = data.llamados
        .filter((t) => !vistosRef.current.has(clave(t)))
        .sort(
          (a, b) =>
            new Date(a.fechaLlamado).getTime() - new Date(b.fechaLlamado).getTime(),
        );

      nuevos.forEach((t) => vistosRef.current.add(clave(t)));

      if (vozRef.current && nuevos.length > 0) {
        void anunciar(nuevos);
      }
    } catch (e) {
      setError(mensajeError(e));
    }
  }, [anunciar]);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => void cargar(), POLL_MS);
    return () => clearInterval(id);
  }, [cargar]);

  /**
   * Desbloquea el audio del navegador. Se intenta al cargar y en la primera
   * interacción (toque o tecla), porque los navegadores exigen un gesto.
   */
  const desbloquearAudio = useCallback(() => {
    if (audioListoRef.current) {
      return;
    }

    try {
      const ctx = audioRef.current ?? new window.AudioContext();
      audioRef.current = ctx;
      if (ctx.state === 'suspended') {
        void ctx
          .resume()
          .then(() => {
            if (ctx.state === 'running') {
              audioListoRef.current = true;
              setAudioListo(true);
            }
          })
          .catch(() => {
            // el navegador aún no permite audio
          });
      } else if (ctx.state === 'running') {
        audioListoRef.current = true;
        setAudioListo(true);
      }
    } catch {
      // sin AudioContext
    }

    if ('speechSynthesis' in window) {
      const warmup = new SpeechSynthesisUtterance('Listo');
      warmup.lang = 'es-CO';
      warmup.volume = 0;
      warmup.onstart = () => {
        audioListoRef.current = true;
        setAudioListo(true);
      };
      window.speechSynthesis.speak(warmup);
    }
  }, []);

  // Intenta habilitar el audio al cargar y con cualquier toque/tecla.
  useEffect(() => {
    if (!preferenciaLeida) {
      return;
    }
    if (vozRef.current) {
      desbloquearAudio();
    }
    const alInteractuar = () => {
      if (vozRef.current) {
        desbloquearAudio();
      }
    };
    window.addEventListener('pointerdown', alInteractuar);
    window.addEventListener('keydown', alInteractuar);
    return () => {
      window.removeEventListener('pointerdown', alInteractuar);
      window.removeEventListener('keydown', alInteractuar);
    };
  }, [preferenciaLeida, desbloquearAudio]);

  const encenderVoz = useCallback(
    (anunciarUltimo: boolean) => {
      setVozActiva(true);
      vozRef.current = true;
      desbloquearAudio();
      if (anunciarUltimo) {
        const ultimo = resumenRef.current?.llamados[0];
        if (ultimo) {
          void anunciar([ultimo]);
        } else {
          void campana();
        }
      }
    },
    [anunciar, campana, desbloquearAudio],
  );

  const silenciar = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVozActiva(false);
    vozRef.current = false;
  }, []);

  const repetir = useCallback(() => {
    const ultimo = resumenRef.current?.llamados[0];
    if (!ultimo) {
      return;
    }
    if (!vozRef.current) {
      setVozActiva(true);
      vozRef.current = true;
    }
    desbloquearAudio();
    void anunciar([ultimo]);
  }, [anunciar, desbloquearAudio]);

  const pantallaCompleta = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.();
    }
  }, []);

  const ultimo = resumen?.llamados[0] ?? null;
  const anteriores = resumen?.llamados.slice(1) ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-5 px-6 py-5 md:px-10">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            <Ticket className="h-8 w-8" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-black leading-none tracking-tight md:text-3xl">
              Sisben<span className="text-brand">Agil</span>
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.32em] text-white/50 md:text-xs">
              Turnos SISBEN
            </p>
          </div>
        </div>

        <div className="order-3 w-full text-center sm:order-none sm:w-auto sm:text-right">
          <p className="font-mono text-4xl font-black leading-none tabular-nums md:text-5xl">
            {ahora ? hora(ahora) : '--:--:--'}
          </p>
          <p className="mt-1 text-xs font-semibold capitalize text-white/50 md:text-sm">
            {ahora ? fechaLarga(ahora) : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              !soportado
                ? 'bg-rose-500/15 text-rose-300'
                : !vozActiva
                  ? 'bg-white/5 text-white/40'
                  : audioListo
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
            {!soportado
              ? 'Sin voz'
              : !vozActiva
                ? 'Silenciado'
                : audioListo
                  ? 'Sonido activo'
                  : 'Toque para sonido'}
          </span>
          <button
            type="button"
            onClick={repetir}
            disabled={!ultimo}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Repetir
          </button>
          <button
            type="button"
            onClick={vozActiva ? silenciar : () => encenderVoz(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10"
          >
            {vozActiva ? (
              <>
                <VolumeX className="h-4 w-4" aria-hidden />
                Silenciar
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" aria-hidden />
                Activar voz
              </>
            )}
          </button>
          <button
            type="button"
            onClick={pantallaCompleta}
            className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 p-2.5 text-white/80 transition hover:bg-white/10"
            aria-label="Pantalla completa"
          >
            <Expand className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      {vozActiva && !audioListo && (
        <div className="mx-auto mb-3 w-full max-w-5xl px-6">
          {soportado ? (
            <button
              type="button"
              onClick={desbloquearAudio}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-amber-400/90 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-300 md:text-base"
            >
              <Volume2 className="h-5 w-5" aria-hidden />
              Toque la pantalla para habilitar el sonido (solo una vez)
            </button>
          ) : (
            <p className="rounded-2xl bg-rose-500/10 px-5 py-3 text-center text-sm font-bold text-rose-300">
              Este navegador no soporta la voz. Use Chrome o Edge para escuchar los llamados.
            </p>
          )}
        </div>
      )}

      {!vozActiva && soportado && (
        <div className="mx-auto mb-3 w-full max-w-5xl px-6">
          <button
            type="button"
            onClick={() => encenderVoz(true)}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white/5 px-5 py-3 text-sm font-bold text-white/60 transition hover:bg-white/10"
          >
            <Volume2 className="h-5 w-5" aria-hidden />
            Sonido silenciado · Toque para activarlo
          </button>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-[1700px] flex-1 gap-6 px-6 pb-8 md:px-10 lg:grid-cols-[1.45fr_0.55fr]">
        <section className="relative flex min-h-[420px] flex-col justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-2xl md:p-12">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-amber-400 to-brand" />

          {ultimo ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-white/70">
                  <BellRing className="h-4 w-4" aria-hidden />
                  Último llamado
                </span>
                <span
                  className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide ${estilo(ultimo.prioridad).badge}`}
                >
                  {ultimo.prioridadEtiqueta}
                </span>
              </div>

              <p className="mt-8 text-[clamp(5rem,15vw,13rem)] font-black leading-[0.85] tracking-tighter">
                {ultimo.codigo}
              </p>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-white/40 md:text-sm">
                Nombre y apellido
              </p>
              <p className="mt-1 break-words text-3xl font-black leading-tight text-white md:text-5xl">
                {ultimo.nombrePersona ?? 'Sin identificación'}
              </p>

              <p className="mt-6 text-2xl font-bold text-white/60 md:text-3xl">Pase a</p>
              <p className="text-4xl font-black text-white md:text-6xl">{ultimo.ventanilla}</p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-white/50">
                <span>Llamado a las {hora(new Date(ultimo.fechaLlamado))}</span>
                {ultimo.llamados > 1 && <span>{ultimo.llamados} llamados</span>}
              </div>
            </>
          ) : (
            <div className="text-center">
              <Monitor className="mx-auto h-20 w-20 text-white/20" aria-hidden />
              <p className="mt-6 text-4xl font-black md:text-5xl">Esperando llamados</p>
              <p className="mt-3 text-lg text-white/50">
                Los turnos aparecerán automáticamente en esta pantalla.
              </p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <Users className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-white/50">En espera</p>
                <p className="text-2xl font-black">{resumen?.enEspera ?? 0}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">Conexión</p>
              <span
                className={`inline-flex items-center gap-1 text-sm font-bold ${
                  error ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {error ? (
                  <WifiOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Wifi className="h-4 w-4" aria-hidden />
                )}
                {error ? 'Sin conexión' : 'En línea'}
              </span>
            </div>
          </div>

          <div className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50">
              Llamados anteriores
            </h2>
            <div className="mt-4 space-y-3">
              {anteriores.map((turno) => (
                <div
                  key={clave(turno)}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/80 px-4 py-3 ring-1 ring-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-10 w-1.5 rounded-full ${estilo(turno.prioridad).barra}`}
                      aria-hidden
                    />
                    <div>
                      <p className="font-mono text-2xl font-black leading-none">{turno.codigo}</p>
                      <p className="mt-1 break-words text-sm font-bold leading-snug text-white/80">
                        {turno.nombrePersona ?? 'Sin identificación'}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-white/50">{turno.ventanilla}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white/40">
                    {hora(new Date(turno.fechaLlamado))}
                  </span>
                </div>
              ))}
              {anteriores.length === 0 && (
                <p className="py-8 text-center text-sm font-semibold text-white/40">
                  Aún no hay otros llamados.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300">
              {error}
            </p>
          )}
        </aside>
      </main>

      <footer className="border-t border-white/10 px-6 py-4 text-center text-xs font-semibold text-white/40 md:px-10">
        SisbenAgil · Pantalla de sala de espera · Actualización automática cada 3 segundos
      </footer>
    </div>
  );
}
