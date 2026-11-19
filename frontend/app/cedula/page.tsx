'use client';

import { useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  FileText,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { api, mensajeError } from '@/lib/api';
import { TIPOS_DOCUMENTO, documentoAlfanumerico } from '@/lib/documentos';
import { useKiosk } from '@/lib/kiosk-context';
import type { Persona, TipoDocumento } from '@/lib/types';
import { KioskShell } from '@/components/KioskShell';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';
import { useDeferredPush } from '@/lib/use-deferred-push';
import { useGuard } from '@/lib/use-guard';
import { useKioskAuth } from '@/lib/use-kiosk-auth';

function normalizarNombreServicio(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * En el kiosco el nombre solo puede contener letras, espacios, apóstrofes y
 * guiones. Se eliminan números y símbolos, incluso al pegar texto.
 */
function limpiarNombreKiosco(valor: string): string {
  return valor
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'’-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '')
    .slice(0, 80)
    .toUpperCase();
}

export default function CedulaPage() {
  const go = useDeferredPush();
  const autenticado = useKioskAuth();
  const { state, hydrated, update } = useKiosk();
  const config = state.config;

  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('CC');
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [personaEncontrada, setPersonaEncontrada] = useState<Persona | null>(null);
  const [consultaRealizada, setConsultaRealizada] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  const esAlfanumerico = documentoAlfanumerico(tipoDocumento);
  const listo = useGuard(hydrated, Boolean(config));

  if (!autenticado || !listo || !config) {
    return (
      <KioskShell>
        <Loading />
      </KioskShell>
    );
  }

  const normalizarDocumento = (valor: string) =>
    valor.replace(esAlfanumerico ? /[^0-9A-Za-z]/g : /\D/g, '').trim();

  const buscarNombre = async () => {
    if (buscando) {
      return;
    }

    const documento = normalizarDocumento(cedula);
    if (documento.length < 5) {
      setError('Escriba un número de documento válido (mínimo 5 caracteres).');
      return;
    }

    setBuscando(true);
    setError(null);
    setConsultaRealizada(false);

    try {
      const persona = await api.buscarPersona(documento);
      setPersonaEncontrada(persona);
      setConsultaRealizada(true);
      if (persona) {
        setNombre(limpiarNombreKiosco(persona.nombreCompleto));
      } else {
        setNombre((actual) => limpiarNombreKiosco(actual));
        window.setTimeout(() => nombreRef.current?.focus(), 0);
      }
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setBuscando(false);
    }
  };

  const continuar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (buscando) {
      return;
    }

    const documento = normalizarDocumento(cedula);
    if (documento.length < 5) {
      setError('Escriba un número de documento válido (mínimo 5 caracteres).');
      return;
    }

    const nombreLimpio = limpiarNombreKiosco(nombre).trim();
    setBuscando(true);
    setError(null);

    try {
      let persona =
        personaEncontrada?.cedula === documento
          ? personaEncontrada
          : await api.buscarPersona(documento);

      setPersonaEncontrada(persona);
      setConsultaRealizada(true);

      const nombreFinal =
        nombreLimpio.length >= 2
          ? nombreLimpio
          : limpiarNombreKiosco(persona?.nombreCompleto ?? '').trim();

      if (nombreFinal.length < 2) {
        setError('Escriba el nombre y apellido del usuario.');
        return;
      }

      setNombre(nombreFinal);
      persona = await api.registrarPersona({
        cedula: documento,
        tipoDocumento,
        nombreCompleto: nombreFinal,
        telefono: persona?.telefono ?? undefined,
      });

      const servicios = await api.servicios();
      const servicio =
        servicios.find((s) => normalizarNombreServicio(s.nombre) === 'SISBEN') ??
        servicios[0];

      if (!servicio) {
        throw new Error('No hay un servicio SISBÉN configurado.');
      }

      update({
        persona,
        cedulaPendiente: null,
        servicio,
        canal: 'TURNO',
        nivel: null,
        ticket: null,
      });
      go('/prioridades');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <KioskShell
      badge="Paso 1 de 3"
      title="Identifíquese"
      subtitle="Digite su documento para consultar o registrar sus datos."
      backHref="/"
      footer="SisbénÁgil · Kiosco de autoservicio"
    >
      <form onSubmit={continuar} className="mx-auto w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-card sm:p-7 md:p-8">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-brand to-ink"
          />
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="tipoDocumento"
                  className="mb-2 block text-sm font-bold uppercase tracking-[0.18em] text-muted"
                >
                  Tipo de documento
                </label>
                <div className="relative">
                  <FileText
                    className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-brand"
                    aria-hidden
                  />
                  <select
                    id="tipoDocumento"
                    value={tipoDocumento}
                    onChange={(event) => {
                      const nuevo = event.target.value as TipoDocumento;
                      setTipoDocumento(nuevo);
                      if (!documentoAlfanumerico(nuevo)) {
                        setCedula((actual) => actual.replace(/\D/g, '').slice(0, 15));
                      }
                      if (personaEncontrada) {
                        setNombre('');
                      }
                      setPersonaEncontrada(null);
                      setConsultaRealizada(false);
                      setError(null);
                    }}
                    disabled={buscando}
                    className="w-full appearance-none rounded-2xl border-2 border-slate-200 bg-canvas py-4 pl-16 pr-11 text-lg font-bold text-ink outline-none transition focus:border-brand focus:bg-white disabled:opacity-60"
                  >
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cedula"
                  className="mb-2 block text-sm font-bold uppercase tracking-[0.18em] text-muted"
                >
                  Número de documento
                </label>
                <div className="relative">
                  <CreditCard
                    className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-brand"
                    aria-hidden
                  />
                  <input
                    id="cedula"
                    value={cedula}
                    onChange={(event) => {
                      const valor = event.target.value;
                      const limpio = esAlfanumerico
                        ? valor
                            .replace(/[^0-9A-Za-z]/g, '')
                            .toUpperCase()
                            .slice(0, 30)
                        : valor.replace(/\D/g, '').slice(0, 15);
                      setCedula(limpio);
                      if (personaEncontrada) {
                        setNombre('');
                      }
                      setPersonaEncontrada(null);
                      setConsultaRealizada(false);
                      setError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void buscarNombre();
                      }
                    }}
                    inputMode={esAlfanumerico ? 'text' : 'numeric'}
                    autoComplete="off"
                    autoFocus
                    maxLength={esAlfanumerico ? 30 : 15}
                    placeholder="Documento"
                    disabled={buscando}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-canvas py-4 pl-16 pr-5 text-2xl font-bold text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white disabled:opacity-60"
                  />
                </div>
                {esAlfanumerico && (
                  <p className="mt-2 text-sm text-muted">
                    Puede escribir letras y números.
                  </p>
                )}
                <p className="mt-1.5 text-sm text-muted">
                  Presione Enter para buscar su nombre.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="nombre"
                className="mb-2 block text-sm font-bold uppercase tracking-[0.18em] text-muted"
              >
                Nombre y apellido
              </label>
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-brand"
                  aria-hidden
                />
                <input
                  id="nombre"
                  ref={nombreRef}
                  value={nombre}
                  onChange={(event) => {
                    setNombre(limpiarNombreKiosco(event.target.value));
                    setError(null);
                  }}
                  autoComplete="off"
                  maxLength={80}
                  placeholder="Nombre y apellidos"
                  disabled={buscando}
                  className={`w-full rounded-2xl border-2 py-4 pl-16 pr-5 text-2xl font-bold outline-none transition placeholder:text-slate-400 focus:bg-white disabled:opacity-60 ${
                    personaEncontrada
                      ? 'border-emerald-300 bg-white text-emerald-900 focus:border-emerald-500'
                      : 'border-slate-200 bg-canvas text-ink focus:border-brand'
                  }`}
                />
              </div>
              <p className="mt-1.5 text-sm text-muted">
                Si está registrado, se completa automáticamente. Puede corregirlo.
                Solo se permiten letras, espacios, apóstrofos y guiones.
              </p>
            </div>

            {personaEncontrada && (
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                  Nombre y apellido del usuario
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-900">
                  {nombre || limpiarNombreKiosco(personaEncontrada.nombreCompleto)}
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  Documento {personaEncontrada.tipoDocumento ?? tipoDocumento}{' '}
                  {personaEncontrada.cedula}
                </p>
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  Puede corregir el nombre en el campo de arriba.
                </p>
              </div>
            )}

            {consultaRealizada && !personaEncontrada && (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  No está registrado
                </p>
                <p className="mt-1 text-lg font-bold text-amber-900">
                  Escriba su nombre y apellido para continuar.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={buscando}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-8 py-4 text-xl font-bold text-white shadow-card transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60"
          >
            {buscando ? 'Consultando…' : 'Continuar'}
            {!buscando && <ArrowRight className="h-6 w-6" aria-hidden />}
          </button>

          <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm font-semibold text-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            Sus datos se usan únicamente para generar el turno.
          </p>
        </div>
      </form>

      <Modal
        open={Boolean(error)}
        tone="error"
        title="No se pudo continuar"
        message={error ?? undefined}
        actionLabel="Entendido"
        onClose={() => setError(null)}
      />
    </KioskShell>
  );
}
