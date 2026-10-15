'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { Bell, BellOff, CheckCircle2, ShieldAlert, Sparkles, Send } from 'lucide-react';
import { RIVER_STATIONS, computeRiverTrendForecast } from '@/lib/dhm-data';

interface FloodNotificationManagerProps {
  compact?: boolean;
}

const emptySubscribe = () => () => {};

export default function FloodNotificationManager({ compact = false }: FloodNotificationManagerProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const browserPermission = useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'),
    () => 'default' as NotificationPermission
  );

  const [overridePermission, setOverridePermission] = useState<NotificationPermission | null>(null);
  const permission = overridePermission || browserPermission;

  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [lastDispatchedTime, setLastDispatchedTime] = useState<string | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const supported = isClient
    ? typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window
    : true;

  // Register Service Worker in background
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSwRegistration(reg);
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    }
  }, []);

  const requestPermission = async () => {
    if (!supported) return;
    try {
      const res = await Notification.requestPermission();
      setOverridePermission(res);
      if (res === 'granted') {
        dispatchDangerNotification(
          'FLOOD ALERTS ACTIVATED: Nepal Hydrology Portal',
          'You will now receive high-priority browser notifications whenever any river exceeds its danger flood limit.'
        );
      }
    } catch (err) {
      console.warn('Permission request error:', err);
    }
  };

  const dispatchDangerNotification = useCallback(
    (customTitle?: string, customBody?: string) => {
      const dangerRiver = RIVER_STATIONS.find((r) => r.waterLevel >= r.danger_level) || RIVER_STATIONS[0];
      const trend = computeRiverTrendForecast(dangerRiver);

      const title =
        customTitle ||
        `CRITICAL FLOOD DANGER: ${dangerRiver.name} (${dangerRiver.waterLevel}m)`;
      const body =
        customBody ||
        `Water level has exceeded the ${dangerRiver.danger_level}m danger threshold by +${(
          dangerRiver.waterLevel - dangerRiver.danger_level
        ).toFixed(2)}m. Flood risk is ${trend.riskAssessment} (${trend.changePercent > 0 ? '+' : ''}${
          trend.changePercent
        }% in ${trend.forecastHours}h). Evacuate lowlands!`;

      // Dispatch through Service Worker if active
      if (swRegistration && swRegistration.active) {
        swRegistration.active.postMessage({
          type: 'TRIGGER_FLOOD_ALERT',
          payload: {
            title,
            body,
            url: '/hydrology',
            riverId: dangerRiver.id,
            tag: `flood-danger-${dangerRiver.id}-${Date.now()}`,
          },
        });
      } else if (Notification.permission === 'granted') {
        // Fallback to standard Notification API
        try {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: `flood-danger-${dangerRiver.id}`,
            requireInteraction: true,
          });
        } catch (e) {
          console.warn('Notification fallback error:', e);
        }
      }

      const now = new Date().toLocaleTimeString();
      setLastDispatchedTime(now);
      setDispatchStatus('Alert dispatched to browser!');
      setTimeout(() => setDispatchStatus(null), 4000);
    },
    [swRegistration]
  );

  if (isClient && !supported) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {permission === 'granted' ? (
          <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Push Active</span>
            <button
              onClick={() => dispatchDangerNotification()}
              className="text-[11px] text-sky-700 hover:text-sky-900 underline ml-1 cursor-pointer font-semibold"
              title="Test real browser notification"
            >
              Test Push
            </button>
          </div>
        ) : permission === 'denied' ? (
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <BellOff className="w-3.5 h-3.5" /> Blocked
          </span>
        ) : (
          <button
            onClick={requestPermission}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
          >
            <Bell className="w-3.5 h-3.5 animate-bounce" />
            <span>Enable Flood Push Alerts</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-50 via-slate-50 to-sky-50 border border-red-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-red-600">
                #ServiceWorkerPush #FloodEarlyWarning
              </span>
              {permission === 'granted' && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Active
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              Browser Push Notifications for Critical Flood Danger
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Stay informed even when this portal is closed. Receive immediate system siren notifications
              the moment Budhigandaki River or any other river crosses the emergency flood limit (7.80m).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:self-center shrink-0">
          {permission === 'granted' ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-100/80 border border-emerald-300 px-3 py-1.5 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Monitoring 336 Gauges</span>
              </div>
              <button
                onClick={() => dispatchDangerNotification()}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Danger Push Alert</span>
              </button>
            </div>
          ) : permission === 'denied' ? (
            <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <BellOff className="w-4 h-4 text-slate-400" />
              <span>Browser notifications blocked in settings</span>
            </div>
          ) : (
            <button
              onClick={requestPermission}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Bell className="w-4 h-4" />
              <span>Enable Flood Push Alerts</span>
            </button>
          )}
        </div>
      </div>

      {dispatchStatus && (
        <div className="mt-3 pt-3 border-t border-red-200/60 text-xs font-semibold text-emerald-700 flex items-center gap-1.5 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{dispatchStatus} (Check your desktop/mobile notification tray)</span>
        </div>
      )}

      {lastDispatchedTime && !dispatchStatus && (
        <div className="mt-2 text-[11px] text-slate-500 font-mono">
          Last test alert sent at: {lastDispatchedTime}
        </div>
      )}
    </div>
  );
}
