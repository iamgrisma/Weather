import Link from 'next/link';
import { CloudSun, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center mx-auto">
        <CloudSun className="w-8 h-8" />
      </div>
      <div className="text-xs font-bold text-sky-600 uppercase tracking-wider">
        #404_PAGE_NOT_FOUND
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
        The weather page or station you are looking for does not exist or has been moved to a dedicated section.
      </p>

      <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-colors shadow-xs"
        >
          <Home className="w-4 h-4" />
          <span>Back to Live Weather</span>
        </Link>
        <Link
          href="/hydrology"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors"
        >
          <span>Rivers & Floods</span>
        </Link>
        <Link
          href="/cities"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors"
        >
          <span>19 Cities</span>
        </Link>
      </div>
    </div>
  );
}
