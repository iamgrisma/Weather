import type {
  NepalWeatherSnapshot,
  RefreshResult,
  RefreshScope,
} from '../dhm/types';
import {
  fetchLiveRiverWatch,
  fetchLiveWeather,
  fetchLiveTourism,
  fetchLiveThreeDayBulletin,
  fetchLiveMountaineering,
  fetchLiveCityForecasts,
  fetchLiveSpecialWeather,
  fetchLivePressReleases,
  fetchLiveNwpModels,
  fetchLiveNepalWeatherSnapshot,
} from '../dhm/fetcher';

const KV_KEY_LATEST = 'NEPAL_WEATHER_LATEST_SNAPSHOT';

// Scope-specific minimum cooldowns in milliseconds
export const COOLDOWN_DURATIONS: Record<RefreshScope, number> = {
  river: 8 * 60 * 1000,     // 8 minutes: dynamic flood water levels (allows reliable 10m cron)
  weather: 25 * 60 * 1000,  // 25 minutes: 24h forecast & manual obs
  tourism: 110 * 60 * 1000, // 110 minutes: trekking stations
  bulletin: 50 * 60 * 1000, // 50 minutes: 3-day synoptic bulletin
  mountain: 50 * 60 * 1000, // 50 minutes: mountaineering telemetry
  cities: 25 * 60 * 1000,   // 25 minutes: 19 city forecasts
  special: 12 * 60 * 1000,  // 12 minutes: special weather advisories & warnings
  press: 50 * 60 * 1000,    // 50 minutes: DHM press releases
  nwp: 170 * 60 * 1000,     // 170 minutes: NWP numerical weather prediction models
  all: 8 * 60 * 1000,       // 8 minutes: overall composite (guarantees 10m cron never throttles)
};

interface EdgeEnv {
  WEATHER_KV?: {
    get: (key: string, type?: 'text' | 'json') => Promise<any>;
    put: (key: string, value: string) => Promise<void>;
  };
  WEATHER_DB?: {
    prepare: (query: string) => {
      bind: (...args: any[]) => {
        run: () => Promise<any>;
        first: () => Promise<any>;
        all: () => Promise<any>;
      };
    };
    batch: (statements: any[]) => Promise<any>;
  };
}

interface MemoryStore {
  snapshot: NepalWeatherSnapshot | null;
  lastLoadedAt: number;
}

// @ts-ignore
import { env as cfEnv } from 'cloudflare:workers';

const memoryStore: MemoryStore = (globalThis as any).__NEPAL_WEATHER_MEM_STORE__ || {
  snapshot: null,
  lastLoadedAt: 0,
};
(globalThis as any).__NEPAL_WEATHER_MEM_STORE__ = memoryStore;

export function getEdgeEnv(locals?: any): EdgeEnv {
  try {
    if (cfEnv && (cfEnv.WEATHER_KV || cfEnv.WEATHER_DB || Object.keys(cfEnv).length > 0)) {
      return cfEnv as EdgeEnv;
    }
  } catch {}
  if ((globalThis as any).__CF_ENV__) return (globalThis as any).__CF_ENV__;
  if (locals?.cfContext?.env) return locals.cfContext.env;
  if (locals?.env) return locals.env;
  try {
    if (locals && (locals.WEATHER_KV || locals.WEATHER_DB)) return locals;
  } catch {}
  if (typeof process !== 'undefined' && process.env) {
    return process.env as any;
  }
  return {};
}

export { cfEnv as env };

/**
 * Reads the latest snapshot with 3-tier caching:
 * 1. Warm V8 Isolate RAM cache (2-minute TTL, zero latency & zero KV reads)
 * 2. Cloudflare KV with edge colocation cacheTtl: 300 (cached at edge data center for 5 min)
 * 3. Fresh upstream hydration on cold start miss
 */
export async function getLatestSnapshot(env: EdgeEnv = {}): Promise<NepalWeatherSnapshot> {
  const now = Date.now();
  const RAM_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes RAM cache inside active isolate

  // 1. Instant RAM cache hit within the active Worker isolate
  if (
    memoryStore.snapshot &&
    Array.isArray(memoryStore.snapshot.riverWatch?.stations) &&
    memoryStore.snapshot.riverWatch.stations.length > 0 &&
    now - memoryStore.lastLoadedAt < RAM_CACHE_TTL_MS
  ) {
    return {
      ...memoryStore.snapshot,
      source: 'cached',
    };
  }

  // 2. Query KV with edge colocation cacheTtl (5 minutes)
  if (env.WEATHER_KV) {
    try {
      const cached = await env.WEATHER_KV.get(KV_KEY_LATEST, { type: 'json', cacheTtl: 300 });
      if (
        cached &&
        typeof cached === 'object' &&
        Array.isArray(cached.riverWatch?.stations) &&
        cached.riverWatch.stations.length > 0
      ) {
        memoryStore.snapshot = cached;
        memoryStore.lastLoadedAt = now;
        return {
          ...cached,
          source: 'cached',
        };
      }
    } catch (err) {
      console.warn('[Storage] KV read error:', err);
    }
  }

  // 3. Fallback to existing memory snapshot if KV was unreachable or empty (reused across build pages)
  if (memoryStore.snapshot) {
    return {
      ...memoryStore.snapshot,
      source: 'cached',
    };
  }

  console.log('[Storage] Cold start cache miss or empty stations. Hydrating initial snapshot...');
  const initial = await fetchLiveNepalWeatherSnapshot();
  await persistFullSnapshot(initial, env, true);
  return initial;
}

async function persistFullSnapshot(
  snapshot: NepalWeatherSnapshot,
  env: EdgeEnv,
  isChanged: boolean
): Promise<void> {
  memoryStore.snapshot = snapshot;
  memoryStore.lastLoadedAt = Date.now();

  if (env.WEATHER_KV) {
    try {
      await env.WEATHER_KV.put(KV_KEY_LATEST, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('[Storage] KV put error:', err);
    }
  }

  if (isChanged && env.WEATHER_DB) {
    try {
      const payloadStr = JSON.stringify(snapshot);
      const compositeHash = `${snapshot.riverWatch.hash}_${snapshot.manualWeather.hash}`;
      await env.WEATHER_DB.prepare(
        `INSERT OR REPLACE INTO weather_snapshots (hash, fetched_at, total_river_stations, danger_count, warning_count, payload_json)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          compositeHash,
          snapshot.fetchedAt,
          snapshot.riverWatch.totalStations,
          snapshot.riverWatch.dangerCount,
          snapshot.riverWatch.warningCount,
          payloadStr
        )
        .run();

      const alerts = snapshot.riverWatch.stations.filter(
        (s) => s.status === 'DANGER' || s.status === 'WARNING'
      );
      if (alerts.length > 0) {
        const statements = alerts.slice(0, 50).map((s) =>
          env.WEATHER_DB!.prepare(
            `INSERT INTO river_observations (snapshot_hash, station_id, station_name, basin, water_level, warning_level, danger_level, status, steady, recorded_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            snapshot.riverWatch.hash,
            s.id,
            s.name,
            s.basin,
            s.waterLevel,
            s.warningLevel,
            s.dangerLevel,
            s.status,
            s.steady,
            s.measuredAt,
            Date.now()
          )
        );
        await env.WEATHER_DB.batch(statements);
      }
    } catch (err) {
      console.warn('[Storage] D1 write error:', err);
    }
  }
}

export function getScopeFetchedAt(snapshot: NepalWeatherSnapshot, scope: RefreshScope): number {
  if (scope === 'river') return snapshot.riverWatch?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'weather') return snapshot.manualWeather?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'tourism') return snapshot.tourismWeather?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'bulletin') return snapshot.threeDayBulletin?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'mountain') return snapshot.mountaineeringWeather?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'cities') return snapshot.cityForecasts?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'special') return snapshot.specialWeather?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'press') return snapshot.pressReleases?.fetchedAt || snapshot.fetchedAt;
  if (scope === 'nwp') return snapshot.nwpModels?.fetchedAt || snapshot.fetchedAt;
  return snapshot.fetchedAt;
}

async function refreshIndividualScope(
  currentSnapshot: NepalWeatherSnapshot,
  scope: RefreshScope,
  now: number
): Promise<{ changed: boolean; message: string }> {
  if (scope === 'river') {
    const freshRiver = await fetchLiveRiverWatch();
    if (freshRiver.stations.length === 0 && currentSnapshot.riverWatch.stations.length > 0) {
      return { changed: false, message: 'Upstream DHM unreachable. Retained active river stations.' };
    }
    if (freshRiver.hash === currentSnapshot.riverWatch.hash) {
      currentSnapshot.riverWatch.lastCheckedAt = now;
      currentSnapshot.lastCheckedAt = now;
      return { changed: false, message: 'River levels verified against DHM: No new readings published.' };
    }
    currentSnapshot.riverWatch = freshRiver;
    currentSnapshot.fetchedAt = now;
    currentSnapshot.lastCheckedAt = now;
    return { changed: true, message: 'Fresh river water levels updated.' };
  }

  if (scope === 'weather') {
    const freshWeather = await fetchLiveWeather();
    if (
      freshWeather.manualWeather.hash === currentSnapshot.manualWeather.hash &&
      freshWeather.countryForecast.hash === currentSnapshot.countryForecast.hash
    ) {
      currentSnapshot.manualWeather.lastCheckedAt = now;
      currentSnapshot.countryForecast.lastCheckedAt = now;
      currentSnapshot.lastCheckedAt = now;
      return { changed: false, message: 'Weather forecast verified: Current bulletin remains active.' };
    }
    currentSnapshot.manualWeather = freshWeather.manualWeather;
    currentSnapshot.countryForecast = freshWeather.countryForecast;
    currentSnapshot.fetchedAt = now;
    currentSnapshot.lastCheckedAt = now;
    return { changed: true, message: 'Fresh national weather forecast updated.' };
  }

  if (scope === 'tourism') {
    const freshTourism = await fetchLiveTourism();
    if (freshTourism.hash === currentSnapshot.tourismWeather.hash) {
      currentSnapshot.tourismWeather.lastCheckedAt = now;
      return { changed: false, message: 'Tourism stations verified: Station status is current.' };
    }
    currentSnapshot.tourismWeather = freshTourism;
    return { changed: true, message: 'Fresh tourism weather updated.' };
  }

  if (scope === 'bulletin') {
    const freshBulletin = await fetchLiveThreeDayBulletin();
    if (freshBulletin.hash === currentSnapshot.threeDayBulletin?.hash) {
      if (currentSnapshot.threeDayBulletin) currentSnapshot.threeDayBulletin.lastCheckedAt = now;
      return { changed: false, message: '3-Day Bulletin verified: Current bulletin remains active.' };
    }
    currentSnapshot.threeDayBulletin = freshBulletin;
    return { changed: true, message: 'Fresh 3-day synoptic bulletin updated.' };
  }

  if (scope === 'mountain') {
    const freshMountain = await fetchLiveMountaineering();
    if (freshMountain.hash === currentSnapshot.mountaineeringWeather?.hash) {
      if (currentSnapshot.mountaineeringWeather) currentSnapshot.mountaineeringWeather.lastCheckedAt = now;
      return { changed: false, message: 'Mountaineering telemetry verified: High-altitude data is current.' };
    }
    currentSnapshot.mountaineeringWeather = freshMountain;
    return { changed: true, message: 'Fresh mountaineering telemetry updated.' };
  }

  if (scope === 'cities') {
    const freshCities = await fetchLiveCityForecasts();
    if (freshCities.hash === currentSnapshot.cityForecasts?.hash) {
      if (currentSnapshot.cityForecasts) currentSnapshot.cityForecasts.lastCheckedAt = now;
      return { changed: false, message: 'City forecasts verified: Multi-day forecasts are current.' };
    }
    currentSnapshot.cityForecasts = freshCities;
    return { changed: true, message: 'Fresh 19-city forecasts updated.' };
  }

  if (scope === 'special') {
    const freshSpecial = await fetchLiveSpecialWeather();
    if (freshSpecial.hash === currentSnapshot.specialWeather?.hash) {
      if (currentSnapshot.specialWeather) currentSnapshot.specialWeather.lastCheckedAt = now;
      return { changed: false, message: 'Special weather advisories verified: Active advisories are current.' };
    }
    currentSnapshot.specialWeather = freshSpecial;
    return { changed: true, message: 'Fresh special weather advisory updated.' };
  }

  if (scope === 'press') {
    const freshPress = await fetchLivePressReleases();
    if (freshPress.hash === currentSnapshot.pressReleases?.hash) {
      if (currentSnapshot.pressReleases) currentSnapshot.pressReleases.lastCheckedAt = now;
      return { changed: false, message: 'DHM Press releases verified: Publications are current.' };
    }
    currentSnapshot.pressReleases = freshPress;
    return { changed: true, message: 'Fresh DHM press releases updated.' };
  }

  if (scope === 'nwp') {
    const freshNwp = await fetchLiveNwpModels();
    if (freshNwp.hash === currentSnapshot.nwpModels?.hash) {
      if (currentSnapshot.nwpModels) currentSnapshot.nwpModels.lastCheckedAt = now;
      return { changed: false, message: 'NWP numerical models verified: Model outputs are current.' };
    }
    currentSnapshot.nwpModels = freshNwp;
    return { changed: true, message: 'Fresh NWP numerical models updated.' };
  }

  return { changed: false, message: 'Unknown scope' };
}

export interface MultiRefreshResult {
  refreshedAt: number;
  updatedScopes: RefreshScope[];
  unchangedScopes: RefreshScope[];
  freshScopes: RefreshScope[];
  cooldowns: Record<string, {
    lastFetchedAt: number;
    ttlSeconds: number;
    remainingSeconds: number;
    isStale: boolean;
  }>;
  snapshot: NepalWeatherSnapshot;
  status: 'updated' | 'unchanged' | 'throttled';
  message: string;
}

export async function refreshStaleScopes(
  env: EdgeEnv = {},
  requestedScope: RefreshScope = 'all',
  force = false
): Promise<MultiRefreshResult> {
  const currentSnapshot = await getLatestSnapshot(env);
  const now = Date.now();
  const updatedScopes: RefreshScope[] = [];
  const unchangedScopes: RefreshScope[] = [];
  const freshScopes: RefreshScope[] = [];
  const cooldowns: MultiRefreshResult['cooldowns'] = {};
  let hasAnyChanged = false;

  const ALL_SCOPES: RefreshScope[] = [
    'river',
    'special',
    'weather',
    'cities',
    'bulletin',
    'mountain',
    'press',
    'tourism',
    'nwp'
  ];

  const targetScopes = requestedScope === 'all' ? ALL_SCOPES : [requestedScope];

  for (const scope of targetScopes) {
    const ttlMs = COOLDOWN_DURATIONS[scope] || 8 * 60 * 1000;
    const lastFetchedAt = getScopeLastFetchedAt(currentSnapshot, scope);
    const elapsedMs = now - lastFetchedAt;
    const remainingMs = Math.max(0, ttlMs - elapsedMs);
    const isStale = force || remainingMs === 0;

    cooldowns[scope] = {
      lastFetchedAt,
      ttlSeconds: Math.round(ttlMs / 1000),
      remainingSeconds: Math.round(remainingMs / 1000),
      isStale,
    };

    if (!isStale) {
      freshScopes.push(scope);
      continue;
    }

    try {
      const res = await refreshIndividualScope(currentSnapshot, scope, now);
      if (res.changed) {
        updatedScopes.push(scope);
        hasAnyChanged = true;
      } else {
        unchangedScopes.push(scope);
      }
    } catch (scopeErr) {
      console.warn(`[AutoRefresh] Error syncing scope '${scope}':`, scopeErr);
      unchangedScopes.push(scope);
    }
  }

  // Update timestamps and persist
  if (hasAnyChanged || updatedScopes.length > 0 || unchangedScopes.length > 0) {
    currentSnapshot.lastCheckedAt = now;
    await persistFullSnapshot(currentSnapshot, env, hasAnyChanged);
  }

  let status: 'updated' | 'unchanged' | 'throttled' = 'throttled';
  let message = 'All requested data is currently fresh within its cooldown window.';

  if (updatedScopes.length > 0) {
    status = 'updated';
    message = `Fresh live data updated for: ${updatedScopes.join(', ')}.`;
  } else if (unchangedScopes.length > 0) {
    status = 'unchanged';
    message = `Upstream verified against DHM: No new readings published for ${unchangedScopes.join(', ')}.`;
  }

  return {
    refreshedAt: now,
    updatedScopes,
    unchangedScopes,
    freshScopes,
    cooldowns,
    snapshot: currentSnapshot,
    status,
    message,
  };
}

export function purgeEdgeCacheForScopes(origin: string, updatedScopes: RefreshScope[]): void {
  try {
    const cache = (globalThis as any).caches?.default;
    if (!cache) return;

    const purgePaths = new Set<string>(['/', '/ne', '/api/data', '/api/refresh']);
    for (const scope of updatedScopes) {
      if (scope === 'river' || scope === 'all') {
        purgePaths.add('/river-watch');
        purgePaths.add('/ne/river-watch');
      }
      if (scope === 'weather' || scope === 'all') {
        purgePaths.add('/weather');
        purgePaths.add('/ne/weather');
      }
      if (scope === 'bulletin' || scope === 'all') {
        purgePaths.add('/bulletin');
        purgePaths.add('/ne/bulletin');
      }
      if (scope === 'cities' || scope === 'all') {
        purgePaths.add('/city-forecast');
        purgePaths.add('/ne/city-forecast');
      }
      if (scope === 'mountain' || scope === 'all') {
        purgePaths.add('/mountaineering');
        purgePaths.add('/ne/mountaineering');
      }
      if (scope === 'special' || scope === 'all') {
        purgePaths.add('/special-weather');
        purgePaths.add('/ne/special-weather');
      }
      if (scope === 'nwp' || scope === 'all') {
        purgePaths.add('/nwp');
        purgePaths.add('/ne/nwp');
      }
      if (scope === 'press' || scope === 'all') {
        purgePaths.add('/press-releases');
        purgePaths.add('/ne/press-releases');
      }
    }

    for (const path of purgePaths) {
      try {
        cache.delete(new Request(`${origin}${path}`));
      } catch {}
    }
  } catch (err) {
    console.warn('[Storage] Edge cache purge error:', err);
  }
}

export async function refreshScopedWithCooldown(
  scope: RefreshScope = 'river',
  env: EdgeEnv = {},
  force = false
): Promise<RefreshResult> {
  const result = await refreshStaleScopes(env, scope, force);
  const remainingMins = Math.ceil((COOLDOWN_DURATIONS[scope] || 8 * 60 * 1000) / 60000);

  return {
    status: result.status,
    scope,
    message: result.message,
    cooldownRemainingMinutes: remainingMins,
    lastFetchedAt: getScopeFetchedAt(result.snapshot, scope),
    lastCheckedAt: result.snapshot.lastCheckedAt,
    snapshot: result.snapshot,
  };
}
