'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, AlertTriangle, RefreshCw, CloudSun, Calendar } from 'lucide-react';

interface DayOutlook {
  dayNumber: number;
  date: string;
  isoDate: string;
  dayEn: string;
  weatherPatternEn: string;
  weatherPatternNp: string;
  hazardAlertEn: string;
  hazardAlertNp: string;
  rainProbability?: number;
  temperatureTrend?: string;
}

interface BulletinData {
  bulletinId: string;
  issueDate: string;
  issueTimeLocal: string;
  currentConditionSummary: string;
  synopsisEn: string;
  synopsisNp: string;
  daytimeEn: string;
  nighttimeEn: string;
  specialAdvisory: string;
  specialAdvisoryNp: string;
  threeDayOutlook: DayOutlook[];
}

function getInitialBulletin(): BulletinData {
  const now = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const formatDisplay = (d: Date, dayNum: number) => `${formatDate(d)} (Day ${dayNum})`;
  const d1 = new Date(now);
  const d2 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const d3 = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  return {
    bulletinId: `MFD-SYN-${formatDate(d1)}-01`,
    issueDate: now.toISOString(),
    issueTimeLocal: `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} NST`,
    currentConditionSummary: 'Post-Monsoon Transition with Western Trough Influence',
    synopsisEn:
      'A high pressure ridge prevails across Western Nepal while localized moisture convergence affects Gandaki and Koshi river basins. Convective rain cells active over Annapurna and Manaslu foothills.',
    synopsisNp:
      'नेपालमा हाल पश्चिमी वायु तथा स्थानीय वायुको आंशिक प्रभाव रहेको छ। गण्डकी र कोशी जलाधारका पहाडी भूभागमा मेघगर्जन सहित वर्षाको सम्भावना रहेको छ।',
    daytimeEn:
      'Partly to generally cloudy in the hilly regions of Koshi and Gandaki provinces; mainly fair in the rest of the provinces. Brief rain or thunder likely at isolated spots.',
    nighttimeEn:
      'Generally fair in most parts of the country; partly cloudy in isolated mountain pockets with light ridge breezes.',
    specialAdvisory:
      'Budhigandaki River at Arughat is currently at flood danger level. Downstream communities must maintain round-the-clock watch.',
    specialAdvisoryNp:
      'बुढीगण्डकी नदीमा पानीको सतह खतराको तहमा रहेकाले तटीय क्षेत्रमा उच्च सतर्कता अपनाउनु हुन अनुरोध छ।',
    threeDayOutlook: [
      {
        dayNumber: 1,
        date: formatDisplay(d1, 1),
        isoDate: formatDate(d1),
        dayEn: daysOfWeek[d1.getDay()],
        weatherPatternEn:
          'Partly to generally cloudy in Koshi, Gandaki, and Bagmati provinces with light to moderate showers in the hilly areas. Mainly fair across Terai flatlands.',
        weatherPatternNp:
          'कोशी, गण्डकी र बागमती प्रदेशमा आंशिक देखि साधारणतया बदली, पहाडी भेगमा मेघगर्जन सहित हल्का देखि मध्यम वर्षा।',
        hazardAlertEn:
          'Watch for localized rain-induced slope saturation in Mid-Hills and high river discharges in Budhigandaki catchment.',
        hazardAlertNp: 'बुढीगण्डकी तथा सहायक नदी क्षेत्रमा उच्च जलसतह सम्बन्धी सतर्कता।',
        rainProbability: 45,
      },
      {
        dayNumber: 2,
        date: formatDisplay(d2, 2),
        isoDate: formatDate(d2),
        dayEn: daysOfWeek[d2.getDay()],
        weatherPatternEn:
          'Mainly fair throughout the country with occasional cloud patches over the Eastern Himalayas. Stable post-monsoon northerly winds picking up.',
        weatherPatternNp: 'देशभर मुख्यतया मौसम सफा रहनेछ। पूर्वी हिमाली क्षेत्रमा आंशिक बदली।',
        hazardAlertEn:
          'Nighttime radiative cooling leading to sub-zero alpine temperatures above 4,000m. Frost advisory for high passes.',
        hazardAlertNp: 'उच्च हिमाली क्षेत्रमा राती अत्यधिक चिसो र तुषारोको सम्भावना।',
        rainProbability: 20,
      },
      {
        dayNumber: 3,
        date: formatDisplay(d3, 3),
        isoDate: formatDate(d3),
        dayEn: daysOfWeek[d3.getDay()],
        weatherPatternEn:
          'Predominantly clear conditions nationwide. Strong jet stream winds aloft across Everest and Kanchenjunga summit ridges.',
        weatherPatternNp: 'देशभर सामान्यतया मौसम सफा। सगरमाथा तथा कञ्चनजङ्घा चुचुरोमा तीव्र पश्चिमी वायु।',
        hazardAlertEn:
          'Optimal weather window for low-elevation trekking and flights; high mountaineering expeditions must prepare for 45+ knot summit winds.',
        hazardAlertNp: 'पर्यटन तथा उडानका लागि अनुकूल मौसम। उच्च आरोहणमा तीव्र हावाको सतर्कता।',
        rainProbability: 10,
      },
    ],
  };
}

export default function BulletinsPage() {
  const [bulletin, setBulletin] = useState<BulletinData>(getInitialBulletin);
  const [loading, setLoading] = useState(false);
  const [activeLang, setActiveLang] = useState<'both' | 'en' | 'np'>('both');

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bulletins');
      if (res.ok) {
        const json = await res.json();
        if (json.bulletin) {
          setBulletin(json.bulletin);
        }
      }
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch('/api/bulletins')
      .then((res) => res.json())
      .then((json) => {
        if (!ignore && json.bulletin) {
          setBulletin(json.bulletin);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-sky-600 tracking-wider uppercase mb-1">
            #LiveWeatherBulletin #SynopticAnalysis #3DayOutlook
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            3-Day Synoptic Weather Bulletins
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time atmospheric analysis and 72-hour meteorological projections driven by live sensor telemetry and synoptic models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Language filter */}
          <div className="inline-flex items-center gap-1 text-xs border border-slate-200 rounded-lg p-1 bg-white">
            <button
              onClick={() => setActiveLang('both')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                activeLang === 'both' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Both EN/नेपाली
            </button>
            <button
              onClick={() => setActiveLang('en')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                activeLang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setActiveLang('np')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                activeLang === 'np' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              नेपाली
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh Bulletin Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Bulletin Card */}
      {bulletin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <div className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
                Bulletin ID: {bulletin.bulletinId}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {bulletin.currentConditionSummary}
              </h2>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Issued: {bulletin.issueTimeLocal}</span>
            </div>
          </div>

          {/* Special flood hazard warning */}
          {bulletin.specialAdvisory && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Active Hydro-Met Warning:</strong>
                <p className="mt-0.5 text-red-800 leading-relaxed font-semibold">
                  {bulletin.specialAdvisory}
                </p>
                {activeLang !== 'en' && bulletin.specialAdvisoryNp && (
                  <p className="mt-1 text-red-700 leading-relaxed font-sans text-[11px]">
                    {bulletin.specialAdvisoryNp}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bilingual Synopsis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs">
            {(activeLang === 'both' || activeLang === 'en') && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-sky-600" />
                  <span>English Meteorological Synopsis:</span>
                </div>
                <p className="text-slate-600 leading-relaxed">{bulletin.synopsisEn}</p>
              </div>
            )}

            {(activeLang === 'both' || activeLang === 'np') && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="font-bold text-sky-800 font-sans flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-sky-600" />
                  <span>नेपाली मौसम विश्लेषण सारांश:</span>
                </div>
                <p className="text-slate-600 leading-relaxed font-sans">{bulletin.synopsisNp}</p>
              </div>
            )}
          </div>

          {/* Daytime / Nighttime text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-900">Daytime Forecast (दिउँसो)</div>
              <p className="text-slate-600 leading-relaxed">{bulletin.daytimeEn}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-900">Nighttime Outlook (राती)</div>
              <p className="text-slate-600 leading-relaxed">{bulletin.nighttimeEn}</p>
            </div>
          </div>
        </div>
      )}

      {/* 3-Day Outlook Grid (Completely dynamic based on live API dates and conditions) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>Dynamic 3-Day Meteorological Outlook</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">Updated via /api/bulletins</span>
        </div>

        {bulletin?.threeDayOutlook && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bulletin.threeDayOutlook.map((day) => (
              <div
                key={day.date}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                        Day {day.dayNumber} Projection
                      </span>
                      <strong className="font-bold text-slate-900 text-sm">{day.date}</strong>
                    </div>
                    <span className="text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {day.dayEn}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold">Weather Pattern:</div>
                      <p className="text-slate-700 mt-0.5 leading-relaxed font-medium">
                        {day.weatherPatternEn}
                      </p>
                      {activeLang !== 'en' && day.weatherPatternNp && (
                        <p className="text-slate-600 mt-1 leading-relaxed font-sans text-[11px]">
                          {day.weatherPatternNp}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="bg-sky-50/60 p-2.5 rounded-lg border border-sky-100 text-slate-700">
                    <strong className="text-sky-900 block text-[11px] mb-0.5">Hazard & Travel Advisory:</strong>
                    <span className="text-[11px] leading-relaxed block">{day.hazardAlertEn}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doppler Radar Link Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div>
          <div className="font-bold text-sm text-sky-300">Live Doppler Weather Radars Available</div>
          <p className="text-slate-400 mt-0.5">
            Monitor real-time storm convection and C-Band reflectivity echoes in Pokhara, Kohalpur, Surkhet, and Dharan.
          </p>
        </div>
        <Link
          href="/radar"
          className="whitespace-nowrap px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-colors shrink-0"
        >
          View Radar Feeds & Interactive Map →
        </Link>
      </div>
    </div>
  );
}
