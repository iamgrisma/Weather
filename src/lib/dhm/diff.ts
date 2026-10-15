import type {
  RiverStation,
  ManualWeatherStation,
  CountryForecast,
  TourismWeatherStation,
} from './types';

export async function computeHash(content: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export function hashRiverWatch(stations: RiverStation[]): Promise<string> {
  const sorted = [...stations]
    .sort((a, b) => a.id - b.id)
    .map((s) => ({
      id: s.id,
      wl: s.waterLevel,
      wr: s.warningLevel,
      dl: s.dangerLevel,
      st: s.steady,
      status: s.status,
      time: s.measuredAt,
    }));
  return computeHash(JSON.stringify(sorted));
}

export function hashManualWeather(
  stations: ManualWeatherStation[],
  issueDate: string
): Promise<string> {
  const sorted = [...stations]
    .sort((a, b) => a.id - b.id)
    .map((s) => ({
      id: s.id,
      min: s.minTemp,
      max: s.maxTemp,
      rain: s.rainfall24h,
    }));
  return computeHash(JSON.stringify({ issueDate, sorted }));
}

export function hashCountryForecast(forecast: CountryForecast | null): Promise<string> {
  if (!forecast) return computeHash('null');
  return computeHash(
    JSON.stringify({
      id: forecast.id,
      date: forecast.issueDate,
      synopsis: forecast.synopsisNp,
    })
  );
}

export function hashTourismWeather(stations: TourismWeatherStation[]): Promise<string> {
  const count = stations.length;
  const ids = stations.map((s) => s.id).join(',');
  return computeHash(JSON.stringify({ count, ids }));
}

export function hashThreeDayBulletin(bulletin: any): Promise<string> {
  if (!bulletin) return computeHash('null');
  return computeHash(JSON.stringify({ id: bulletin.id, date: bulletin.issueDate, title: bulletin.title }));
}

export function hashMountaineeringWeather(data: any): Promise<string> {
  if (!data) return computeHash('null');
  return computeHash(JSON.stringify({ date: data.issueDate, divisions: data.divisions?.length }));
}

export function hashCityForecasts(stations: any[]): Promise<string> {
  return computeHash(JSON.stringify((stations || []).map((s: any) => ({ id: s.id, f: s.forecasts }))));
}

export function hashSpecialWeather(data: { items: any[]; activeNotice: any }): Promise<string> {
  const topIds = (data.items || []).slice(0, 5).map((i) => `${i.id}-${i.createdAt}`).join(',');
  const notice = data.activeNotice?.id || 'none';
  return computeHash(JSON.stringify({ topIds, notice }));
}

export function hashPressReleases(items: any[]): Promise<string> {
  const topIds = (items || []).slice(0, 5).map((i) => `${i.id}-${i.date || ''}`).join(',');
  return computeHash(JSON.stringify({ count: items?.length || 0, topIds }));
}

export function hashNwpModels(models: any[]): Promise<string> {
  const names = (models || []).map((m) => m.name).join(',');
  return computeHash(JSON.stringify({ count: models?.length || 0, names }));
}

