import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'emerald' | 'amber' | 'slate' | 'blue' | 'red';

const TONOS: Record<Tone, string> = {
  brand: 'bg-brand-light text-brand',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-sky-100 text-sky-600',
  red: 'bg-red-100 text-brand',
};

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail?: string;
  tone?: Tone;
}

export function StatCard({ icon, label, value, detail, tone = 'brand' }: StatCardProps) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-kiosk">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl',
            TONOS[tone],
          )}
          aria-hidden
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-4xl font-black leading-none text-ink">{value}</p>
      {detail && <p className="mt-1.5 text-sm font-semibold text-muted">{detail}</p>}
    </div>
  );
}
