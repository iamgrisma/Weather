import Link from 'next/link';
import { CloudSun } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 text-xs mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                <CloudSun className="w-5 h-5 text-sky-600" />
              </div>
              <span className="font-extrabold text-slate-900 text-base">Nepal Weather</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Simple, accurate weather forecasts and real-time river flood safety across all provinces and cities of Nepal.
            </p>
          </div>

          {/* Popular Cities */}
          <div className="space-y-2">
            <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider">Top Cities</h4>
            <ul className="space-y-2 text-slate-600">
              <li><Link href="/cities" className="hover:text-sky-600 transition-colors">Kathmandu Weather</Link></li>
              <li><Link href="/cities" className="hover:text-sky-600 transition-colors">Pokhara Weather</Link></li>
              <li><Link href="/cities" className="hover:text-sky-600 transition-colors">Biratnagar Weather</Link></li>
              <li><Link href="/cities" className="hover:text-sky-600 transition-colors">Nepalgunj & Terai</Link></li>
            </ul>
          </div>

          {/* Rivers & Mountains */}
          <div className="space-y-2">
            <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider">Rivers & Peaks</h4>
            <ul className="space-y-2 text-slate-600">
              <li><Link href="/hydrology" className="hover:text-sky-600 transition-colors">Bagmati & Narayani Rivers</Link></li>
              <li><Link href="/hydrology" className="hover:text-sky-600 transition-colors">Saptakoshi River Water Level</Link></li>
              <li><Link href="/mountains" className="hover:text-sky-600 transition-colors">Mt. Everest & High Peaks</Link></li>
              <li><Link href="/trekking" className="hover:text-sky-600 transition-colors">Annapurna & EBC Trails</Link></li>
            </ul>
          </div>

          {/* Data & About */}
          <div className="space-y-2">
            <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider">Data & Radar</h4>
            <ul className="space-y-2 text-slate-600">
              <li><Link href="/bulletins" className="hover:text-sky-600 transition-colors">Doppler Weather Radars</Link></li>
              <li><Link href="/bulletins" className="hover:text-sky-600 transition-colors">3-Day Weather Advisory</Link></li>
              <li><Link href="/api-docs" className="hover:text-sky-600 transition-colors">Weather API Documentation</Link></li>
              <li><Link href="/" className="hover:text-sky-600 transition-colors">OpenStreetMap Live Map</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500">
          <div>© 2026 Nepal Weather · Updated every 10 minutes</div>
          <div>Map data: © OpenStreetMap contributors · Timezone: Nepal (UTC+5:45)</div>
        </div>
      </div>
    </footer>
  );
}
