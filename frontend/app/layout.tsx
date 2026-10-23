import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { KioskProvider } from '@/lib/kiosk-context';
import { AuthProvider } from '@/lib/auth-context';

const montserrat = localFont({
  src: [
    { path: './fonts/Montserrat-Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/Montserrat-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: './fonts/Montserrat-Black.ttf', weight: '900', style: 'normal' },
  ],
  variable: '--font-montserrat',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const metadata: Metadata = {
  title: 'SisbenAgil · Turnos',
  description: 'Kiosco de autoservicio para la asignación de turnos de SISBEN',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E11D2E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={montserrat.variable}>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <AuthProvider>
          <KioskProvider>{children}</KioskProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
