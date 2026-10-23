export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-5 py-16" role="status" aria-live="polite">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
      <p className="text-lg text-muted">{label}</p>
    </div>
  );
}
