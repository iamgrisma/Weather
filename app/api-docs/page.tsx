'use client';

import { useState, useMemo } from 'react';
import { DHM_API_DIRECTORY, ApiEndpointSpec } from '@/lib/dhm-data';
import {
  Code2,
  Copy,
  Check,
  Play,
  Search,
} from 'lucide-react';

export default function ApiDocsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeEndpoint, setActiveEndpoint] = useState<ApiEndpointSpec>(DHM_API_DIRECTORY[0]);
  const [activeTab, setActiveTab] = useState<'curl' | 'javascript' | 'response'>('curl');
  const [isCopied, setIsCopied] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    DHM_API_DIRECTORY.forEach((ep) => set.add(ep.category));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredEndpoints = useMemo(() => {
    return DHM_API_DIRECTORY.filter((ep) => {
      const matchesSearch =
        ep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' || ep.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [searchTerm, selectedCategory]);

  const curlSnippet = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://api.nepalweather.live';
    const targetUrl = activeEndpoint.url.startsWith('http') ? activeEndpoint.url : `${origin}${activeEndpoint.url}`;
    const auth = activeEndpoint.authHeader ? ` \\\n  -H "${activeEndpoint.authHeader}"` : '';
    return `curl -s -X ${activeEndpoint.method} "${targetUrl}"${auth} \\\n  -H "Accept: application/json"`;
  }, [activeEndpoint]);

  const jsSnippet = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://api.nepalweather.live';
    const targetUrl = activeEndpoint.url.startsWith('http') ? activeEndpoint.url : `${origin}${activeEndpoint.url}`;
    const headers = activeEndpoint.authHeader
      ? `{\n    '${activeEndpoint.authHeader.split(':')[0]}': '${activeEndpoint.authHeader.split(':')[1]?.trim()}',\n    'Accept': 'application/json'\n  }`
      : `{\n    'Accept': 'application/json'\n  }`;

    return `// JavaScript / Node.js
const response = await fetch('${targetUrl}', {
  method: '${activeEndpoint.method}',
  headers: ${headers}
});
const data = await response.json();
console.log(data);`;
  }, [activeEndpoint]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const executeTestQuery = async () => {
    setIsLoading(true);
    setTestResult(null);

    if (activeEndpoint.url.startsWith('/api/')) {
      try {
        const res = await fetch(activeEndpoint.url, { method: activeEndpoint.method });
        const json = await res.json();
        setTestResult(JSON.stringify(json, null, 2));
        setActiveTab('response');
      } catch (err) {
        setTestResult(JSON.stringify({ error: String(err) }, null, 2));
        setActiveTab('response');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setTimeout(() => {
      setTestResult(JSON.stringify(activeEndpoint.sampleResponse, null, 2));
      setActiveTab('response');
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Simple Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-sky-600 font-semibold mb-1">
          <Code2 className="w-4 h-4" />
          <span>NEPAL WEATHER DEVELOPER APIS</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Weather & River API Reference
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Complete catalog of 47 hydrological, weather forecast, mountain wind, and radar endpoints.
        </p>
      </div>

      {/* Selected Endpoint Focus Panel (Top, Clean) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                  activeEndpoint.method === 'POST' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                }`}
              >
                {activeEndpoint.method}
              </span>
              <span className="text-xs text-slate-500">{activeEndpoint.category}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{activeEndpoint.name}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                copyToClipboard(
                  activeTab === 'curl'
                    ? curlSnippet
                    : activeTab === 'javascript'
                    ? jsSnippet
                    : testResult || JSON.stringify(activeEndpoint.sampleResponse, null, 2)
                )
              }
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              onClick={executeTestQuery}
              disabled={isLoading}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isLoading ? 'Fetching...' : 'Test Request'}</span>
            </button>
          </div>
        </div>

        {/* URL Box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-sky-800 break-all select-all">
          {activeEndpoint.url}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {activeEndpoint.description}
        </p>

        {activeEndpoint.authHeader && (
          <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <strong className="text-slate-800 mr-2">Auth Header:</strong>
            <span className="font-mono text-slate-700">{activeEndpoint.authHeader}</span>
          </div>
        )}

        {/* Snippet Tabs */}
        <div className="pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'curl' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              cURL
            </button>
            <button
              onClick={() => setActiveTab('javascript')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'javascript' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              JavaScript
            </button>
            <button
              onClick={() => setActiveTab('response')}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === 'response' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Response JSON
            </button>
          </div>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs mt-3">
            {activeTab === 'curl' && <pre className="text-emerald-400 whitespace-pre-wrap">{curlSnippet}</pre>}
            {activeTab === 'javascript' && <pre className="text-sky-300 whitespace-pre-wrap">{jsSnippet}</pre>}
            {activeTab === 'response' && (
              <pre className="text-amber-300 whitespace-pre-wrap">
                {testResult || JSON.stringify(activeEndpoint.sampleResponse, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Endpoints Directory (Flat, natural flow) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search endpoints by name or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 shadow-2xs"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl text-slate-700 px-3 py-2 text-xs focus:outline-hidden cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All 47 Endpoints' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Endpoints List (Natural Grid, NO trapped scrollbar) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredEndpoints.map((ep) => {
            const isSelected = activeEndpoint.id === ep.id;
            return (
              <div
                key={ep.id}
                onClick={() => {
                  setActiveEndpoint(ep);
                  setTestResult(null);
                  window.scrollTo({ top: 80, behavior: 'smooth' });
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs ${
                  isSelected
                    ? 'bg-sky-50 border-sky-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wide truncate max-w-[180px]">
                    {ep.category.replace(/^\d+\.\s*/, '')}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      ep.method === 'POST' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {ep.method}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">{ep.name}</h4>
                <div className="font-mono text-[11px] text-slate-500 truncate">{ep.url}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
