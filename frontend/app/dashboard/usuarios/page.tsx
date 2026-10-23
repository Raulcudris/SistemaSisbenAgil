'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyRound,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserCog,
  UserX,
} from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ROLES_ADMIN } from '@/lib/roles';
import { useAuthGuard } from '@/lib/use-auth-guard';
import type { Rol, UsuarioAdmin } from '@/lib/types';
import { AdminModal } from '@/components/AdminModal';
import { Loading } from '@/components/Loading';
import { StaffShell } from '@/components/StaffShell';

const INPUT =
  'w-full rounded-2xl border border-slate-200 bg-canvas px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:bg-white';

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{4,60}$/;
const MENSAJE_USERNAME =
  'El usuario debe tener entre 4 y 60 caracteres: letras, números, punto, guion o guion bajo.';

const ROL_ETIQUETA: Record<Rol, string> = {
  ADMIN: 'Administrador',
  ASESOR: 'Asesor',
  KIOSCO: 'Kiosco',
};

const ROL_ESTILO: Record<Rol, string> = {
  ADMIN: 'bg-brand-light text-brand-dark',
  ASESOR: 'bg-sky-100 text-sky-700',
  KIOSCO: 'bg-emerald-100 text-emerald-700',
};

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

function fecha(iso: string): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('es-CO');
}

export default function UsuariosAdminPage() {
  const router = useRouter();
  const listo = useAuthGuard(ROLES_ADMIN);
  const { token, usuario: sesion, ventanillas, actualizarSesion, cerrarSesion } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    username: '',
    password: '',
    rol: 'ASESOR' as Rol,
  });
  const [creando, setCreando] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);

  const [resetUser, setResetUser] = useState<UsuarioAdmin | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  const [editUser, setEditUser] = useState<UsuarioAdmin | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!token) {
        return;
      }
      if (!silencioso) {
        setCargando(true);
      }
      try {
        const data = await api.adminUsuarios(token);
        setUsuarios(data);
        setError(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          cerrarSesion();
          router.replace('/login');
          return;
        }
        setError(mensajeError(e));
      } finally {
        setCargando(false);
      }
    },
    [token, cerrarSesion, router],
  );

  useEffect(() => {
    if (listo && token) {
      cargar();
    }
  }, [listo, token, cargar]);

  const crear = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    const nombre = form.nombre.replace(/\s+/g, ' ').trim();
    const username = form.username.trim();
    if (nombre.length < 2) {
      setError('El nombre y apellido deben tener al menos 2 caracteres.');
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setError(MENSAJE_USERNAME);
      return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setCreando(true);
    setError(null);
    setMensaje(null);
    try {
      const nuevo = await api.adminCrearUsuario(token, {
        nombre,
        username,
        password: form.password,
        rol: form.rol,
      });
      setUsuarios((prev) =>
        [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
      setForm({ nombre: '', username: '', password: '', rol: 'ASESOR' });
      setMensaje(`Usuario ${nuevo.username} creado correctamente.`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setCreando(false);
    }
  };

  const alternar = async (usuario: UsuarioAdmin) => {
    if (!token) {
      return;
    }
    if (
      usuario.activo &&
      !window.confirm(
        `¿Desactivar a ${usuario.nombre}? No podrá iniciar sesión hasta que lo reactive.`,
      )
    ) {
      return;
    }
    setAccionando(usuario.id);
    setError(null);
    setMensaje(null);
    try {
      const actualizado = await api.adminActualizarUsuario(token, usuario.id, {
        activo: !usuario.activo,
      });
      setUsuarios((prev) =>
        prev.map((item) => (item.id === actualizado.id ? actualizado : item)),
      );
      setMensaje(
        actualizado.activo
          ? `${actualizado.nombre} fue activado.`
          : `${actualizado.nombre} fue desactivado.`,
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setAccionando(null);
    }
  };

  const guardarPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !resetUser) {
      return;
    }
    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setGuardandoPassword(true);
    setError(null);
    setMensaje(null);
    try {
      await api.adminActualizarUsuario(token, resetUser.id, {
        password: nuevaPassword,
      });
      setMensaje(`Contraseña actualizada para ${resetUser.nombre}.`);
      setResetUser(null);
      setNuevaPassword('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setGuardandoPassword(false);
    }
  };

  const guardarEdicion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !editUser) {
      return;
    }
    const nombre = editNombre.replace(/\s+/g, ' ').trim();
    const username = editUsername.trim();
    if (nombre.length < 2) {
      setError('El nombre y apellido deben tener al menos 2 caracteres.');
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setError(MENSAJE_USERNAME);
      return;
    }
    setGuardandoEdicion(true);
    setError(null);
    setMensaje(null);
    try {
      const actualizado = await api.adminActualizarUsuario(token, editUser.id, {
        nombre,
        username,
      });
      setUsuarios((prev) =>
        prev
          .map((item) => (item.id === actualizado.id ? actualizado : item))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      );
      if (sesion && actualizado.id === sesion.id) {
        actualizarSesion({
          usuario: {
            ...sesion,
            nombre: actualizado.nombre,
            username: actualizado.username,
          },
          ventanillas,
        });
      }
      setMensaje(`Usuario actualizado: ${actualizado.nombre} (${actualizado.username}).`);
      setEditUser(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminar = async (usuario: UsuarioAdmin) => {
    if (!token) {
      return;
    }
    if (
      !window.confirm(
        `¿Eliminar a ${usuario.nombre} (${usuario.username})? Desaparecerá de la lista y no podrá iniciar sesión. Sus turnos históricos se conservan.`,
      )
    ) {
      return;
    }
    setAccionando(usuario.id);
    setError(null);
    setMensaje(null);
    try {
      await api.adminEliminarUsuario(token, usuario.id);
      setUsuarios((prev) => prev.filter((item) => item.id !== usuario.id));
      if (editUser?.id === usuario.id) {
        setEditUser(null);
      }
      if (resetUser?.id === usuario.id) {
        setResetUser(null);
      }
      setMensaje(`Usuario ${usuario.username} eliminado.`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setAccionando(null);
    }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) {
      return usuarios;
    }
    return usuarios.filter(
      (usuario) =>
        usuario.nombre.toLowerCase().includes(q) ||
        usuario.username.toLowerCase().includes(q),
    );
  }, [usuarios, busqueda]);

  const conteos = useMemo(
    () => ({
      ASESOR: usuarios.filter((usuario) => usuario.rol === 'ASESOR').length,
      KIOSCO: usuarios.filter((usuario) => usuario.rol === 'KIOSCO').length,
      ADMIN: usuarios.filter((usuario) => usuario.rol === 'ADMIN').length,
    }),
    [usuarios],
  );

  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  return (
    <StaffShell
      title="Usuarios"
      subtitle="Cree asesores y operadores de kiosco; edite su nombre y usuario de acceso, actívelos, desactívelos o elimínelos"
      actions={
        <button
          type="button"
          onClick={() => cargar()}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-70"
        >
          <RefreshCw className={cargando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
          Actualizar
        </button>
      }
    >
      {mensaje && (
        <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {mensaje}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-brand">
          {error}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl bg-white p-6 shadow-kiosk">
          <h2 className="text-xl font-black text-ink">Nuevo usuario</h2>
          <p className="mt-1 text-sm text-muted">
            El asesor atiende ventanillas; el operador de kiosco genera los turnos y queda
            registrado en los reportes.
          </p>

          <form onSubmit={crear} className="mt-5 space-y-4">
            <Campo label="Nombre completo">
              <input
                value={form.nombre}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, nombre: event.target.value }));
                  setError(null);
                }}
                required
                maxLength={150}
                placeholder="María Pérez"
                className={INPUT}
              />
            </Campo>

            <Campo label="Usuario de acceso">
              <input
                value={form.username}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, username: event.target.value }));
                  setError(null);
                }}
                required
                minLength={4}
                maxLength={60}
                autoComplete="off"
                placeholder="mperez o kiosco2"
                className={INPUT}
              />
            </Campo>

            <Campo label="Contraseña">
              <input
                type="password"
                value={form.password}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, password: event.target.value }));
                  setError(null);
                }}
                required
                minLength={6}
                maxLength={72}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className={INPUT}
              />
            </Campo>

            <Campo label="Rol">
              <select
                value={form.rol}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rol: event.target.value as Rol }))
                }
                className={INPUT}
              >
                <option value="ASESOR">Asesor de ventanilla</option>
                <option value="KIOSCO">Operador de kiosco</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </Campo>

            <button
              type="submit"
              disabled={creando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-70"
            >
              <UserCog className="h-4 w-4" aria-hidden />
              {creando ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-canvas px-4 py-3 text-xs text-muted">
            <p className="font-bold text-ink">Resumen</p>
            <p className="mt-1">
              {conteos.ASESOR} {conteos.ASESOR === 1 ? 'asesor' : 'asesores'} ·{' '}
              {conteos.KIOSCO} {conteos.KIOSCO === 1 ? 'operador de kiosco' : 'operadores de kiosco'} ·{' '}
              {conteos.ADMIN} {conteos.ADMIN === 1 ? 'administrador' : 'administradores'}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-kiosk">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-ink">Usuarios ({usuarios.length})</h2>
              <p className="mt-1 text-sm text-muted">
                Los usuarios desactivados no pueden iniciar sesión.
              </p>
            </div>
            <label className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre o usuario"
                className="w-64 rounded-full border border-slate-200 bg-canvas py-2 pl-9 pr-4 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:bg-white"
              />
            </label>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase tracking-wide text-muted">
                  <th className="pb-3">Nombre</th>
                  <th className="pb-3">Rol</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Creado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((usuario) => {
                  const esMismo = usuario.id === sesion?.id;
                  return (
                    <tr key={usuario.id}>
                      <td className="py-3">
                        <p className="font-bold text-ink">{usuario.nombre}</p>
                        <p className="text-xs font-semibold text-muted">{usuario.username}</p>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${ROL_ESTILO[usuario.rol]}`}
                        >
                          {ROL_ETIQUETA[usuario.rol]}
                        </span>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                            usuario.activo
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 text-xs font-semibold text-muted">
                        {fecha(usuario.creadoEn)}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditUser(usuario);
                              setEditNombre(usuario.nombre);
                              setEditUsername(usuario.username);
                              setResetUser(null);
                              setError(null);
                              setMensaje(null);
                            }}
                            disabled={accionando === usuario.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => alternar(usuario)}
                            disabled={accionando === usuario.id || (esMismo && usuario.activo)}
                            title={
                              esMismo && usuario.activo
                                ? 'No puede desactivar su propio usuario'
                                : undefined
                            }
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              usuario.activo
                                ? 'bg-red-50 text-brand hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {usuario.activo ? (
                              <UserX className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" aria-hidden />
                            )}
                            {usuario.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetUser(usuario);
                              setNuevaPassword('');
                              setEditUser(null);
                              setError(null);
                            }}
                            disabled={accionando === usuario.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-muted transition hover:bg-brand-light hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <KeyRound className="h-3.5 w-3.5" aria-hidden />
                            Contraseña
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(usuario)}
                            disabled={accionando === usuario.id || esMismo}
                            title={
                              esMismo
                                ? 'No puede eliminar su propio usuario'
                                : undefined
                            }
                            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-brand transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted">
                      No hay usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AdminModal
        open={Boolean(editUser)}
        title="Editar usuario"
        description={
          editUser
            ? `Actualice el nombre y el usuario de acceso de ${editUser.nombre}.`
            : undefined
        }
        onClose={() => {
          if (!guardandoEdicion) {
            setEditUser(null);
            setError(null);
          }
        }}
      >
        <form onSubmit={guardarEdicion} className="space-y-4">
          <Campo label="Nombre y apellido">
            <input
              value={editNombre}
              onChange={(event) => {
                setEditNombre(event.target.value);
                setError(null);
              }}
              required
              minLength={2}
              maxLength={150}
              autoFocus
              placeholder="María Pérez"
              className={INPUT}
            />
          </Campo>
          <Campo label="Usuario de acceso">
            <input
              value={editUsername}
              onChange={(event) => {
                setEditUsername(event.target.value);
                setError(null);
              }}
              required
              minLength={4}
              maxLength={60}
              autoComplete="off"
              placeholder="mperez o kiosco2"
              className={INPUT}
            />
            <span className="mt-1.5 block text-xs font-semibold text-muted">
              Lo usa para iniciar sesión. Entre 4 y 60 letras, números, punto, guion o
              guion bajo.
            </span>
          </Campo>
          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-brand">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditUser(null);
                setError(null);
              }}
              disabled={guardandoEdicion}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoEdicion}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-70"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminModal
        open={Boolean(resetUser)}
        title="Cambiar contraseña"
        description={
          resetUser
            ? `Nueva contraseña para ${resetUser.nombre} (${resetUser.username}).`
            : undefined
        }
        onClose={() => {
          if (!guardandoPassword) {
            setResetUser(null);
            setNuevaPassword('');
          }
        }}
      >
        <form onSubmit={guardarPassword} className="space-y-4">
          <Campo label="Nueva contraseña">
            <input
              type="password"
              value={nuevaPassword}
              onChange={(event) => setNuevaPassword(event.target.value)}
              required
              minLength={6}
              maxLength={72}
              autoComplete="new-password"
              autoFocus
              placeholder="Mínimo 6 caracteres"
              className={INPUT}
            />
          </Campo>
          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-brand">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setResetUser(null);
                setNuevaPassword('');
              }}
              disabled={guardandoPassword}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoPassword}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-70"
            >
              <KeyRound className="h-4 w-4" aria-hidden />
              {guardandoPassword ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </div>
        </form>
      </AdminModal>
    </StaffShell>
  );
}
