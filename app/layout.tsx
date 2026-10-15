import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const viewport: Viewport = {
  themeColor: '#0284c7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Nepal Weather – Live Forecast, Flood Alerts & Rain Radar',
  description: 'Simple and accurate weather for Nepal. Live temperature, rainfall chance, flood alerts for all major rivers, Himalayan mountain winds, and 7-day city forecasts.',
  keywords: [
    'Nepal weather',
    'Kathmandu weather today',
    'Pokhara weather',
    'Nepal rain forecast',
    'Nepal river flood alert',
    'Everest weather',
    'Nepal weather map',
  ],
  authors: [{ name: 'Nepal Weather' }],
  creator: 'Nepal Weather',
  openGraph: {
    type: 'website',
    locale: 'en_NP',
    url: 'https://nepalweather.app',
    title: 'Nepal Weather – Live Forecast, Flood Alerts & Rain Radar',
    description: 'Clean, simple weather forecast and river alerts for Nepal. Check current temperature, rain chance, and river water levels.',
    siteName: 'Nepal Weather',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nepal Weather – Live Forecast & Flood Alerts',
    description: 'Current weather, rainfall chances, river water levels, and city forecasts across Nepal.',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Nepal Weather',
  applicationCategory: 'WeatherApplication',
  operatingSystem: 'All',
  description: 'Simple, accurate weather forecast and river flood alerts for cities and trekking routes in Nepal.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth bg-slate-50 text-slate-900">
      <head>
        <link rel="preconnect" href="https://tile.openstreetmap.org" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 font-sans antialiased selection:bg-sky-500 selection:text-white" suppressHydrationWarning>
        <Header />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
