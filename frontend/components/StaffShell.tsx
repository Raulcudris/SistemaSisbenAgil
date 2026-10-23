'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  LayoutDashboard,
  Lock,
  LogOut,
  Monitor,
  ShieldCheck,
  UserCog,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';
import { BrandLogo } from './BrandLogo';

interface StaffShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  mostrarVentanilla?: boolean;
}

interface NavItemProps {
  href: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}

function NavItem({ href, active, icon, children }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition',
        active ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-brand-light hover:text-brand-dark',
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

export function StaffShell({
  children,
  title,
  subtitle,
  actions,
  mostrarVentanilla = false,
}: StaffShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    usuario,
    ventanillas,
    ventanillaId,
    seleccionarVentanilla,
    cerrarSesion,
  } = useAuth();

  const salir = () => {
    cerrarSesion();
    router.replace('/login');
  };

  const esAdmin = usuario?.rol === 'ADMIN';
  const ventanillaActual = ventanillas.find((v) => v.id === ventanillaId) ?? null;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:px-8">
          <Link href="/" className="shrink-0" aria-label="Ir al kiosco">
            <BrandLogo size="sm" />
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            {esAdmin && (
              <>
                <NavItem
                  href="/dashboard"
                  active={pathname === '/dashboard'}
                  icon={<LayoutDashboard className="h-4 w-4" aria-hidden />}
                >
                  Dashboard
                </NavItem>
                <NavItem
                  href="/dashboard/usuarios"
                  active={pathname.startsWith('/dashboard/usuarios')}
                  icon={<UserCog className="h-4 w-4" aria-hidden />}
                >
                  Usuarios
                </NavItem>
                <NavItem
                  href="/dashboard/ventanillas"
                  active={pathname.startsWith('/dashboard/ventanillas')}
                  icon={<DoorOpen className="h-4 w-4" aria-hidden />}
                >
                  Ventanillas
                </NavItem>
                <NavItem
                  href="/dashboard/reportes"
                  active={pathname.startsWith('/dashboard/reportes')}
                  icon={<BarChart3 className="h-4 w-4" aria-hidden />}
                >
                  Reportes
                </NavItem>
                <NavItem
                  href="/dashboard/atenciones"
                  active={pathname.startsWith('/dashboard/atenciones')}
                  icon={<ClipboardList className="h-4 w-4" aria-hidden />}
                >
                  Atenciones
                </NavItem>
              </>
            )}
            <NavItem
              href="/ventanilla"
              active={pathname === '/ventanilla'}
              icon={<Monitor className="h-4 w-4" aria-hidden />}
            >
              Ventanilla
            </NavItem>
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {esAdmin && mostrarVentanilla && ventanillas.length > 0 && (
              <label className="relative inline-flex items-center">
                <span className="sr-only">Ventanilla</span>
                <select
                  value={ventanillaId ?? ''}
                  onChange={(event) =>
                    seleccionarVentanilla(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  className="appearance-none rounded-full border border-slate-200 bg-white py-2 pl-4 pr-9 text-sm font-bold text-ink shadow-sm outline-none transition focus:border-brand"
                >
                  {ventanillas.map((ventanilla) => (
                    <option key={ventanilla.id} value={ventanilla.id}>
                      {ventanilla.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 h-4 w-4 text-muted"
                  aria-hidden
                />
              </label>
            )}

            {!esAdmin && ventanillaActual && (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm">
                <Monitor className="h-4 w-4 text-brand" aria-hidden />
                {ventanillaActual.nombre}
                <Lock className="h-3.5 w-3.5 text-muted" aria-hidden />
              </span>
            )}

            <span className="hidden items-center gap-2 rounded-full bg-canvas px-4 py-2 text-sm font-bold text-ink sm:inline-flex">
              {usuario?.rol === 'ADMIN' ? (
                <ShieldCheck className="h-4 w-4 text-brand" aria-hidden />
              ) : (
                <UserRound className="h-4 w-4 text-brand" aria-hidden />
              )}
              {usuario?.nombre ?? 'Funcionario'}
            </span>

            <button
              type="button"
              onClick={salir}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        {(title || subtitle || actions) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && (
                <h1 className="text-3xl font-black tracking-tight text-ink md:text-4xl">
                  {title}
                </h1>
              )}
              {subtitle && <p className="mt-1 text-base text-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
