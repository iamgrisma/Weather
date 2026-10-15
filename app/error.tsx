'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error if needed
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">
        #TELEMETRY_REFRESH_REQUIRED
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
        Temporary Weather Feed Issue
      </h1>
      <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
        The weather data feed encountered a transient issue. You can retry fetching or return to the main dashboard.
      </p>

      <div className="pt-4 flex items-center justify-center gap-3 text-xs">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Loading</span>
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>
    </div>
  );
}
