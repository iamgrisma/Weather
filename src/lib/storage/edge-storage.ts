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
}

const memoryStore: MemoryStore = (globalThis as any).__NEPAL_WEATHER_MEM_STORE__ || {
  snapshot: null,
};
(globalThis as any).__NEPAL_WEATHER_MEM_STORE__ = memoryStore;

let cloudflareEnv: any = null;
try {
  // @ts-ignore
  const cfWorkers = await import('cloudflare:workers');
  if (cfWorkers && cfWorkers.env) {
    cloudflareEnv = cfWorkers.env;
  }
} catch {
  // Gracefully ignored in Node.js / standalone dev server
}

export function getEdgeEnv(locals?: any): EdgeEnv {
  if (cloudflareEnv) return cloudflareEnv;
  if ((globalThis as any).__CF_ENV__) return (globalThis as any).__CF_ENV__;
  try {
    if (locals && (locals.WEATHER_KV || locals.WEATHER_DB)) return locals;
  } catch {}
  return {};
}

/**
 * Reads the latest snapshot from KV or in-memory cache.
 * If empty on initial boot, hydrates live snapshot.
 */
export async function getLatestSnapshot(env: EdgeEnv = {}): Promise<NepalWeatherSnapshot> {
  if (env.WEATHER_KV) {
    try {
      const cached = await env.WEATHER_KV.get(KV_KEY_LATEST, 'json');
      if (cached && typeof cached === 'object' && Array.isArray(cached.riverWatch?.stations) && cached.riverWatch.stations.length > 0) {
        return {
          ...cached,
          source: 'cached',
        };
      }
    } catch (err) {
      console.warn('[Storage] KV read error:', err);
    }
  }

  if (memoryStore.snapshot && memoryStore.snapshot.riverWatch.stations.length > 0) {
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

/**
 * SCOPED REFRESH ENGINE:
 * Only hits upstream for the specific domain the user/cron requested.
 * Prevents CPU time waste and upstream timeouts.
 */
export async function refreshScopedWithCooldown(
  scope: RefreshScope = 'river',
  env: EdgeEnv = {},
  force = false
): Promise<RefreshResult> {
  const currentSnapshot = await getLatestSnapshot(env);
  const now = Date.now();
  const allowedCooldown = COOLDOWN_DURATIONS[scope];

  // Determine last fetched time for this scope
  let lastFetchedAt = currentSnapshot.fetchedAt;
  let lastCheckedAt = currentSnapshot.lastCheckedAt;

  if (scope === 'river') {
    lastFetchedAt = currentSnapshot.riverWatch.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.riverWatch.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'weather') {
    lastFetchedAt = currentSnapshot.manualWeather.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.manualWeather.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'tourism') {
    lastFetchedAt = currentSnapshot.tourismWeather.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.tourismWeather.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'bulletin') {
    lastFetchedAt = currentSnapshot.threeDayBulletin?.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.threeDayBulletin?.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'mountain') {
    lastFetchedAt = currentSnapshot.mountaineeringWeather?.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.mountaineeringWeather?.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'cities') {
    lastFetchedAt = currentSnapshot.cityForecasts?.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.cityForecasts?.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'special') {
    lastFetchedAt = currentSnapshot.specialWeather?.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.specialWeather?.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'press') {
    lastFetchedAt = currentSnapshot.pressReleases?.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.pressReleases?.lastCheckedAt || currentSnapshot.lastCheckedAt;
  } else if (scope === 'nwp') {
    lastFetchedAt = currentSnapshot.nwpModels?.fetchedAt || currentSnapshot.fetchedAt;
    lastCheckedAt = currentSnapshot.nwpModels?.lastCheckedAt || currentSnapshot.lastCheckedAt;
  }

  const elapsedMs = now - lastFetchedAt;
  const remainingMs = allowedCooldown - elapsedMs;

  // 1. Throttle if within scope cooldown
  if (!force && remainingMs > 0) {
    const remainingMins = Math.ceil(remainingMs / 60000);
    const elapsedMins = Math.floor(elapsedMs / 60000);
    return {
      status: 'throttled',
      scope,
      message: `${scope.toUpperCase()} data was updated ${elapsedMins} min ago. Please wait ${remainingMins} min before requesting another fresh fetch.`,
      cooldownRemainingMinutes: remainingMins,
      lastFetchedAt,
      lastCheckedAt,
      snapshot: currentSnapshot,
    };
  }

  // 2. Cooldown passed: fetch ONLY requested scope
  try {
    let hasChanged = false;

    if (scope === 'river') {
      const freshRiver = await fetchLiveRiverWatch();
      if (freshRiver.stations.length === 0 && currentSnapshot.riverWatch.stations.length > 0) {
        return {
          status: 'error',
          scope,
          message: 'Upstream DHM temporarily unreachable. Retaining active station data.',
          cooldownRemainingMinutes: 1,
          lastFetchedAt: currentSnapshot.riverWatch.fetchedAt,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      if (freshRiver.hash === currentSnapshot.riverWatch.hash) {
        // Unchanged: touch timestamp, DO NOT write to D1
        currentSnapshot.riverWatch.lastCheckedAt = now;
        currentSnapshot.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'River levels verified against DHM: No new readings published yet.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.river / 60000),
          lastFetchedAt: currentSnapshot.riverWatch.fetchedAt,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.riverWatch = freshRiver;
      currentSnapshot.fetchedAt = now;
      currentSnapshot.lastCheckedAt = now;
      hasChanged = true;
    } else if (scope === 'weather') {
      const freshWeather = await fetchLiveWeather();
      if (
        freshWeather.manualWeather.hash === currentSnapshot.manualWeather.hash &&
        freshWeather.countryForecast.hash === currentSnapshot.countryForecast.hash
      ) {
        currentSnapshot.manualWeather.lastCheckedAt = now;
        currentSnapshot.countryForecast.lastCheckedAt = now;
        currentSnapshot.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'Weather forecast verified against MFD: Current bulletin remains active.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.weather / 60000),
          lastFetchedAt: currentSnapshot.manualWeather.fetchedAt,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.manualWeather = freshWeather.manualWeather;
      currentSnapshot.countryForecast = freshWeather.countryForecast;
      currentSnapshot.fetchedAt = now;
      currentSnapshot.lastCheckedAt = now;
      hasChanged = true;
    } else if (scope === 'tourism') {
      const freshTourism = await fetchLiveTourism();
      if (freshTourism.hash === currentSnapshot.tourismWeather.hash) {
        currentSnapshot.tourismWeather.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'Tourism stations verified: Station status is current.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.tourism / 60000),
          lastFetchedAt: currentSnapshot.tourismWeather.fetchedAt,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.tourismWeather = freshTourism;
      hasChanged = true;
    } else if (scope === 'bulletin') {
      const freshBulletin = await fetchLiveThreeDayBulletin();
      if (freshBulletin.hash === currentSnapshot.threeDayBulletin?.hash) {
        if (currentSnapshot.threeDayBulletin) currentSnapshot.threeDayBulletin.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: '3-Day Bulletin verified: Current bulletin remains active.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.bulletin / 60000),
          lastFetchedAt: currentSnapshot.threeDayBulletin?.fetchedAt || now,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.threeDayBulletin = freshBulletin;
      hasChanged = true;
    } else if (scope === 'mountain') {
      const freshMountain = await fetchLiveMountaineering();
      if (freshMountain.hash === currentSnapshot.mountaineeringWeather?.hash) {
        if (currentSnapshot.mountaineeringWeather) currentSnapshot.mountaineeringWeather.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'Mountaineering telemetry verified: High-altitude data is current.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.mountain / 60000),
          lastFetchedAt: currentSnapshot.mountaineeringWeather?.fetchedAt || now,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.mountaineeringWeather = freshMountain;
      hasChanged = true;
    } else if (scope === 'cities') {
      const freshCities = await fetchLiveCityForecasts();
      if (freshCities.hash === currentSnapshot.cityForecasts?.hash) {
        if (currentSnapshot.cityForecasts) currentSnapshot.cityForecasts.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'City forecasts verified: Multi-day forecasts are current.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.cities / 60000),
          lastFetchedAt: currentSnapshot.cityForecasts?.fetchedAt || now,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.cityForecasts = freshCities;
      hasChanged = true;
    } else if (scope === 'special') {
      const freshSpecial = await fetchLiveSpecialWeather();
      if (freshSpecial.hash === currentSnapshot.specialWeather?.hash) {
        if (currentSnapshot.specialWeather) currentSnapshot.specialWeather.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'Special weather advisories verified: Active advisories are current.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.special / 60000),
          lastFetchedAt: currentSnapshot.specialWeather?.fetchedAt || now,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.specialWeather = freshSpecial;
      hasChanged = true;
    } else if (scope === 'press') {
      const freshPress = await fetchLivePressReleases();
      if (freshPress.hash === currentSnapshot.pressReleases?.hash) {
        if (currentSnapshot.pressReleases) currentSnapshot.pressReleases.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'DHM Press releases verified: Publications are current.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.press / 60000),
          lastFetchedAt: currentSnapshot.pressReleases?.fetchedAt || now,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.pressReleases = freshPress;
      hasChanged = true;
    } else if (scope === 'nwp') {
      const freshNwp = await fetchLiveNwpModels();
      if (freshNwp.hash === currentSnapshot.nwpModels?.hash) {
        if (currentSnapshot.nwpModels) currentSnapshot.nwpModels.lastCheckedAt = now;
        await persistFullSnapshot(currentSnapshot, env, false);
        return {
          status: 'unchanged',
          scope,
          message: 'NWP numerical models verified: Model outputs are current.',
          cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS.nwp / 60000),
          lastFetchedAt: currentSnapshot.nwpModels?.fetchedAt || now,
          lastCheckedAt: now,
          snapshot: currentSnapshot,
        };
      }
      currentSnapshot.nwpModels = freshNwp;
      hasChanged = true;
    } else {
      // Scope === 'all'
      const freshAll = await fetchLiveNepalWeatherSnapshot();
      currentSnapshot.riverWatch = freshAll.riverWatch;
      currentSnapshot.manualWeather = freshAll.manualWeather;
      currentSnapshot.countryForecast = freshAll.countryForecast;
      currentSnapshot.tourismWeather = freshAll.tourismWeather;
      currentSnapshot.bulletins = freshAll.bulletins;
      currentSnapshot.threeDayBulletin = freshAll.threeDayBulletin;
      currentSnapshot.specialWeather = freshAll.specialWeather;
      currentSnapshot.pressReleases = freshAll.pressReleases;
      currentSnapshot.nwpModels = freshAll.nwpModels;
      currentSnapshot.mountaineeringWeather = freshAll.mountaineeringWeather;
      currentSnapshot.cityForecasts = freshAll.cityForecasts;
      currentSnapshot.fetchedAt = now;
      currentSnapshot.lastCheckedAt = now;
      hasChanged = true;
    }

    // Persist new updated snapshot (and log to D1 if changed)
    await persistFullSnapshot(currentSnapshot, env, hasChanged);

    return {
      status: 'updated',
      scope,
      message: `Fresh live ${scope} data successfully retrieved and cached at the edge.`,
      cooldownRemainingMinutes: Math.ceil(COOLDOWN_DURATIONS[scope] / 60000),
      lastFetchedAt: now,
      lastCheckedAt: now,
      snapshot: currentSnapshot,
    };
  } catch (err: any) {
    console.error(`[Storage] Refresh failed for scope ${scope}:`, err);
    return {
      status: 'error',
      scope,
      message: `Upstream query failed for ${scope}: ${err?.message || 'Network timeout'}. Serving cached data.`,
      cooldownRemainingMinutes: 0,
      lastFetchedAt,
      lastCheckedAt,
      snapshot: currentSnapshot,
    };
  }
}
