'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BellRing,
  Expand,
  Monitor,
  RotateCcw,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api, mensajeError } from '@/lib/api';
import type { TvLlamado, TvResumen } from '@/lib/types';

// Se consulta con frecuencia para que todas las TV detecten el llamado antes
// de la hora programada de audio y puedan reproducirlo sincronizadas.
const POLL_MS = 1000;
const PAUSA_ENTRE_LLAMADOS_MS = 5000;
// Margen para que todas las TV reciban el llamado antes de reproducirlo.
const BUFFER_SINCRONIA_MS = 4000;
const CLAVE_VOZ = 'sisbenagil.tv.voz';

interface AnuncioPendiente {
  turno: TvLlamado;
  /** Hora local (epoch) en la que debe comenzar la campana y la locución. */
  programadoEn: number;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

const ESTILO_PRIORIDAD: Record<
  number,
  { badge: string; barra: string }
> = {
  1: { badge: 'bg-brand text-white', barra: 'bg-brand' },
  2: { badge: 'bg-slate-600 text-white', barra: 'bg-slate-400' },
  3: { badge: 'bg-amber-500 text-slate-950', barra: 'bg-amber-400' },
};

function hora(date: Date): string {
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
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

const UNIDADES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho',
  'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis',
  'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós',
  'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete',
  'veintiocho', 'veintinueve',
];

const DECENAS = [
  '', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta',
  'ochenta', 'noventa',
];

const CENTENAS = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
];

const PREFIJOS_HABLADOS: Record<string, string> = {
  GN: 'G N',
  PR: 'P R',
  JR: 'J R',
};

/** Número natural en palabras para que no se lea dígito por dígito. */
function numeroEnPalabras(valor: number): string {
  const n = Math.trunc(Math.abs(valor));
  if (!Number.isFinite(n)) {
    return String(valor);
  }
  if (n < 30) {
    return UNIDADES[n];
  }
  if (n < 100) {
    const decena = Math.floor(n / 10);
    const unidad = n % 10;
    return unidad === 0 ? DECENAS[decena] : `${DECENAS[decena]} y ${UNIDADES[unidad]}`;
  }
  if (n === 100) {
    return 'cien';
  }
  if (n < 1000) {
    const centena = Math.floor(n / 100);
    const resto = n % 100;
    return resto === 0
      ? CENTENAS[centena]
      : `${CENTENAS[centena]} ${numeroEnPalabras(resto)}`;
  }
  if (n < 1000000) {
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    const prefijo = miles === 1 ? 'mil' : `${numeroEnPalabras(miles)} mil`;
    return resto === 0 ? prefijo : `${prefijo} ${numeroEnPalabras(resto)}`;
  }
  return n.toLocaleString('es-CO');
}

/** Convierte "GN-010" en "G N diez" para que la voz lo pronuncie bien. */
function codigoHablado(codigo: string): string {
  const coincidencia = codigo.trim().match(/^([A-Za-zÁÉÍÓÚÜÑ]+)\s*-\s*(\d+)$/);
  if (!coincidencia) {
    return codigo.replace(/-/g, ' ').trim();
  }
  const prefijo = coincidencia[1].toUpperCase();
  const prefijoHablado = PREFIJOS_HABLADOS[prefijo] ?? prefijo.split('').join(' ');
  return `${prefijoHablado} ${numeroEnPalabras(Number(coincidencia[2]))}`;
}

/** Nombre en formato natural para que la síntesis de voz no lo lea entrecortado. */
function nombreHablado(nombre?: string | null): string {
  const limpio = (nombre ?? '')
    .replace(/[._]+/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!limpio) {
    return '';
  }
  return limpio
    .toLocaleLowerCase('es-CO')
    .replace(
      /(^|[\s'’])([a-záéíóúüñ])/g,
      (_, separador: string, letra: string) =>
        `${separador}${letra.toLocaleUpperCase('es-CO')}`,
    );
}

/** Número de la ventanilla ("V1", "Ventanilla 1") en palabras. */
function numeroVentanillaHablado(turno: TvLlamado): string | null {
  for (const fuente of [turno.ventanillaCodigo, turno.ventanilla]) {
    const coincidencia = fuente?.match(/(\d+)(?!.*\d)/);
    if (coincidencia) {
      return numeroEnPalabras(Number(coincidencia[1]));
    }
  }
  return null;
}

function destinoHablado(turno: TvLlamado): string {
  const numero = numeroVentanillaHablado(turno);
  if (numero) {
    return `Diríjase a ventanilla número ${numero}.`;
  }
  const nombre = nombreHablado(turno.ventanilla);
  return nombre ? `Diríjase a ${nombre}.` : 'Diríjase a la ventanilla asignada.';
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
  const colaAnunciosRef = useRef<AnuncioPendiente[]>([]);
  const anunciandoRef = useRef(false);
  const desfaseServidorRef = useRef(0);
  const generacionAnunciosRef = useRef(0);

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
    return new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-CO';
      // Velocidad normal, manteniendo claros los nombres y números.
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      // Se conserva la primera voz española del navegador, la misma que se
      // usaba antes de los cambios de pronunciación.
      const voces = vocesRef.current.length > 0 ? vocesRef.current : synth.getVoices();
      const voz = voces.find((v) => v.lang.toLowerCase().startsWith('es'));
      if (voz) {
        utterance.voice = voz;
      }

      let terminado = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const finalizar = () => {
        if (terminado) {
          return;
        }
        terminado = true;
        if (timeout) {
          globalThis.clearTimeout(timeout);
        }
        resolve();
      };

      timeout = globalThis.setTimeout(
        finalizar,
        Math.max(15000, texto.length * 120),
      );
      utterance.onend = finalizar;
      utterance.onerror = finalizar;

      try {
        synth.speak(utterance);
      } catch {
        finalizar();
      }
    });
  }, []);

  const anunciarTurno = useCallback(
    async (turno: TvLlamado) => {
      const codigo = codigoHablado(turno.codigo);
      const nombre = nombreHablado(turno.nombrePersona);
      const destino = destinoHablado(turno);
      const mensaje = nombre
        ? `Turno ${codigo}. ${nombre}. ${destino}`
        : `Turno ${codigo}. ${destino}`;

      await campana();
      await esperar(650);
      await hablar(`${mensaje} Repito. ${mensaje}`);
    },
    [campana, hablar],
  );

  const procesarAnuncios = useCallback(
    async function procesar() {
      if (anunciandoRef.current) {
        return;
      }

      anunciandoRef.current = true;
      const generacion = generacionAnunciosRef.current;
      try {
        while (vozRef.current && generacion === generacionAnunciosRef.current) {
          const anuncio = colaAnunciosRef.current.shift();
          if (!anuncio) {
            break;
          }

          // Todas las TV calculan la misma hora objetivo con la hora del
          // servidor, así reproducen el mismo llamado al mismo tiempo.
          const esperaHasta = anuncio.programadoEn - Date.now();
          if (esperaHasta > 0) {
            await esperar(esperaHasta);
          }
          if (!vozRef.current || generacion !== generacionAnunciosRef.current) {
            break;
          }

          await anunciarTurno(anuncio.turno);
          if (!vozRef.current || generacion !== generacionAnunciosRef.current) {
            break;
          }
          // Deja pasar 5 segundos antes de tomar el siguiente llamado.
          await esperar(PAUSA_ENTRE_LLAMADOS_MS);
        }
      } catch {
        // Si una locución falla, no se bloquean los llamados siguientes.
      } finally {
        anunciandoRef.current = false;
        if (vozRef.current && colaAnunciosRef.current.length > 0) {
          void procesar();
        }
      }
    },
    [anunciarTurno],
  );

  const encolarAnuncios = useCallback(
    (llamados: TvLlamado[]) => {
      if (!vozRef.current || llamados.length === 0) {
        return;
      }

      const desfase = desfaseServidorRef.current;
      const anuncios = llamados.map((turno) => {
        const fecha = Date.parse(turno.fechaLlamado);
        const base = Number.isFinite(fecha) ? fecha : Date.now();
        return {
          turno,
          programadoEn: base + BUFFER_SINCRONIA_MS - desfase,
        };
      });
      colaAnunciosRef.current.push(...anuncios);
      void procesarAnuncios();
    },
    [procesarAnuncios],
  );

  const cargar = useCallback(async () => {
    try {
      const inicioPeticion = Date.now();
      const data = await api.tv();
      const finPeticion = Date.now();
      setResumen(data);
      setError(null);

      // La hora del servidor permite compensar relojes desfasados entre las
      // TV. Se usa el punto medio de la petición para descontar la latencia
      // de red y que ambas calculen casi la misma hora objetivo.
      const servidorMs = Date.parse(data.actualizado);
      if (Number.isFinite(servidorMs)) {
        desfaseServidorRef.current =
          servidorMs - (inicioPeticion + finPeticion) / 2;
      }

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
        encolarAnuncios(nuevos);
      }
    } catch (e) {
      setError(mensajeError(e));
    }
  }, [encolarAnuncios]);

  useEffect(() => {
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Encadena las consultas: evita solicitudes simultáneas si el backend
    // tarda en responder y mantiene el intervalo de un segundo.
    const ciclo = async () => {
      if (cancelado) {
        return;
      }
      await cargar();
      if (!cancelado) {
        timer = setTimeout(ciclo, POLL_MS);
      }
    };

    void ciclo();
    return () => {
      cancelado = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
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
          encolarAnuncios([ultimo]);
        } else {
          void campana();
        }
      }
    },
    [campana, desbloquearAudio, encolarAnuncios],
  );

  const silenciar = useCallback(() => {
    generacionAnunciosRef.current += 1;
    colaAnunciosRef.current = [];
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
    encolarAnuncios([ultimo]);
  }, [desbloquearAudio, encolarAnuncios]);

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
      <header className="flex flex-wrap items-center justify-between gap-5 px-6 py-4 md:px-10">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/40 ring-1 ring-white/20">
            <Image
              src="/logos/digiturnos-icon.svg"
              alt=""
              aria-hidden
              width={512}
              height={512}
              priority
              unoptimized
              className="h-full w-full object-contain"
            />
          </span>
          <div>
            <p className="text-3xl font-black leading-none tracking-tight md:text-4xl 2xl:text-5xl">
              Sisbén<span className="text-brand">Ágil</span>
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.32em] text-white/50 md:text-sm">
              Turnos SISBÉN
            </p>
          </div>
        </div>

        <div className="order-3 w-full text-center sm:order-none sm:w-auto sm:text-right">
          <p className="font-mono text-5xl font-black leading-none tabular-nums md:text-6xl 2xl:text-7xl">
            {ahora ? hora(ahora) : '--:--:--'}
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-white/50 md:text-base 2xl:text-lg">
            {ahora ? fechaLarga(ahora) : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold md:text-base ${
              !soportado
                ? 'bg-rose-500/15 text-rose-300'
                : !vozActiva
                  ? 'bg-white/5 text-white/40'
                  : audioListo
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-300'
            }`}
          >
            <Volume2 className="h-4 w-4" aria-hidden />
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
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 disabled:opacity-40 md:text-base"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Repetir
          </button>
          <button
            type="button"
            onClick={vozActiva ? silenciar : () => encenderVoz(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 md:text-base"
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

      <main className="mx-auto mt-2 grid w-full max-w-[1700px] flex-1 gap-6 px-6 pb-8 md:px-10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative flex min-h-[420px] flex-col justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-8 py-6 shadow-2xl md:px-10 md:py-7 2xl:px-12 2xl:py-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-amber-400 to-brand" />

          {ultimo ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black uppercase tracking-[0.25em] text-white/70 md:text-base">
                  <BellRing className="h-5 w-5" aria-hidden />
                  Último llamado
                </span>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-black uppercase tracking-wide md:text-base ${estilo(ultimo.prioridad).badge}`}
                >
                  {ultimo.prioridadEtiqueta}
                </span>
              </div>

              <p className="mt-6 whitespace-nowrap text-[clamp(5rem,12vw,12rem)] font-black leading-[0.82] tracking-tighter">
                {ultimo.codigo}
              </p>

              <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-white/40 md:text-base 2xl:text-lg">
                Nombre y apellido
              </p>
              <p className="mt-1 break-words text-4xl font-black leading-tight text-white md:text-5xl 2xl:text-7xl">
                {ultimo.nombrePersona ?? 'Sin identificación'}
              </p>

              <p className="mt-5 text-3xl font-bold text-white/60 md:text-4xl 2xl:text-5xl">Pase a</p>
              <p className="text-5xl font-black text-white md:text-6xl 2xl:text-8xl">{ultimo.ventanilla}</p>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-base font-semibold text-white/50 md:text-lg 2xl:text-xl">
                <span>Llamado a las {hora(new Date(ultimo.fechaLlamado))}</span>
                {ultimo.llamados > 1 && <span>{ultimo.llamados} llamados</span>}
              </div>
            </>
          ) : (
            <div className="text-center">
              <Monitor className="mx-auto h-24 w-24 text-white/20" aria-hidden />
              <p className="mt-6 text-5xl font-black md:text-6xl">Esperando llamados</p>
              <p className="mt-3 text-xl text-white/50 md:text-2xl">
                Los turnos aparecerán automáticamente en esta pantalla.
              </p>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col gap-4">
          <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-5 py-4 2xl:px-6 2xl:py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 2xl:h-14 2xl:w-14">
                <Users className="h-6 w-6 2xl:h-7 2xl:w-7" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-white/50 2xl:text-base">En espera</p>
                <p className="text-3xl font-black md:text-4xl 2xl:text-5xl">{resumen?.enEspera ?? 0}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-wide text-white/50 2xl:text-base">Conexión</p>
              <span
                className={`inline-flex items-center gap-1 text-base font-bold 2xl:text-lg ${
                  error ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {error ? (
                  <WifiOff className="h-5 w-5" aria-hidden />
                ) : (
                  <Wifi className="h-5 w-5" aria-hidden />
                )}
                {error ? 'Sin conexión' : 'En línea'}
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-white/5 p-5 2xl:p-6">
            <h2 className="text-base font-black uppercase tracking-[0.2em] text-white/50 md:text-lg 2xl:text-xl">
              Llamados anteriores
            </h2>
            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 2xl:space-y-4">
              {anteriores.map((turno) => (
                <div
                  key={clave(turno)}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900/80 px-5 py-4 ring-1 ring-white/5"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={`h-12 w-1.5 shrink-0 rounded-full ${estilo(turno.prioridad).barra}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-3xl font-black leading-none md:text-4xl 2xl:text-5xl">
                        {turno.codigo}
                      </p>
                      <p className="mt-1 break-words text-xl font-bold leading-snug text-white/90 md:text-2xl 2xl:text-3xl">
                        {turno.nombrePersona ?? 'Sin identificación'}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white/65 md:text-xl 2xl:text-2xl">
                        {turno.ventanilla}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-white/40 md:text-base 2xl:text-lg">
                    {hora(new Date(turno.fechaLlamado))}
                  </span>
                </div>
              ))}
              {anteriores.length === 0 && (
                <p className="py-8 text-center text-base font-semibold text-white/40 2xl:text-lg">
                  Aún no hay otros llamados.
                </p>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-base font-semibold text-rose-300">
              {error}
            </p>
          )}
        </aside>
      </main>

      <footer className="border-t border-white/10 px-6 py-4 text-center text-sm font-semibold text-white/40 md:px-10 md:text-base">
        SisbénÁgil · Pantalla de sala de espera · Actualización automática
      </footer>
    </div>
  );
}
