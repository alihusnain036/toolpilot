import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { siteUrl } from '@/config/env';

import './globals.css';

/**
 * Fonts are self-hosted: next/font downloads the files at build time and
 * serves them from our own origin, so no request ever leaves for a font CDN.
 * That is what lets the Content-Security-Policy in vercel.json keep
 * `font-src 'self'` with no third-party origin.
 */
const fontSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ToolPilot',
    template: '%s · ToolPilot',
  },
  description:
    'Free, fast online tools that run entirely in your browser — nothing you open is ever uploaded.',
  applicationName: 'ToolPilot',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {/*
          The real header, footer and mobile navigation land in the
          site-shell ticket (TKT-3). This placeholder keeps the document
          structure and the landmark a skip link will target.
        */}
        <div id="app-root" className="flex min-h-screen flex-col">
          <main id="main" className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
