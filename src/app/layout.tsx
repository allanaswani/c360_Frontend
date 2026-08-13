import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { asset } from '@/lib/asset';

// HFCB's organisation typeface is Cambria (a serif), so the app is set in Cambria
// with Georgia/Times as cross-platform fallbacks — see --font-sans in globals.css.
// No web-font fetch: Cambria ships with the org's Windows/Office estate.

export const metadata: Metadata = {
  title: 'Customer 360 · HFCB',
  description: 'Everything HFCB knows about a customer — portfolio health and next best product, in one instrument.',
  icons: { icon: asset('/favicon.png') },
};

// Set the theme before first paint to avoid a flash.
const noFlash = `(function(){try{var t=localStorage.getItem('c360-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
