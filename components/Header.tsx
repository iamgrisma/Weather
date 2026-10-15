'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CloudSun,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';
import FloodNotificationManager from '@/components/FloodNotificationManager';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Weather' },
    { href: '/cities', label: '19 Cities' },
    { href: '/hydrology', label: 'Rivers & Floods' },
    { href: '/rainfall', label: 'Rainfall' },
    { href: '/mountains', label: 'Mountains' },
    { href: '/trekking', label: 'Trekking' },
    { href: '/radar', label: 'Radar' },
    { href: '/bulletins', label: 'Bulletins' },
    { href: '/api-docs', label: 'API' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Simple Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 group-hover:bg-sky-100 transition-colors">
            <CloudSun className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 text-base tracking-tight leading-none group-hover:text-sky-600 transition-colors">
              Nepal Weather
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Live Forecast & River Radar
            </div>
          </div>
        </Link>

        {/* Clean Typographic Navigation (Zero Pills, Subtle Hover Underlines) */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-semibold">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors py-1 ${
                  isActive
                    ? 'text-sky-600 border-b-2 border-sky-600 font-bold'
                    : 'text-slate-600 hover:text-slate-950 hover:underline underline-offset-4'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Active Danger Indicator and Push Notifications Control */}
        <div className="hidden sm:flex items-center gap-3">
          <FloodNotificationManager compact={true} />
          <Link
            href="/hydrology"
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Budhigandaki: 8.85m</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-md focus:outline-hidden hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 pt-3 pb-5 space-y-1 shadow-md">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 text-sm font-semibold ${
                  isActive
                    ? 'text-sky-600 font-bold bg-sky-50 rounded-md'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
