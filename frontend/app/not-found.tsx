import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-8 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand">Error 404</p>
      <h1 className="text-4xl font-black text-ink md:text-6xl">Pantalla no encontrada</h1>
      <p className="max-w-xl text-lg text-muted">
        La página que busca no existe o el flujo del kiosco se reinició.
      </p>
      <Link
        href="/"
        className="rounded-2xl bg-brand px-8 py-4 text-lg font-bold text-white shadow-card transition hover:bg-brand-dark"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
