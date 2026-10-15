import type {
  RiverStation,
  ManualWeatherStation,
  CountryForecast,
  TourismWeatherStation,
  FloodBulletin,
  TrekkingRoute,
  ThreeDayBulletin,
  MountaineeringWeather,
  MountainForecastDivision,
  CityForecastStation,
  CityForecastDay,
  SpecialWeatherAdvisory,
  DhmPressRelease,
  NwpModelInfo,
  EmergencyNotice,
  NepalWeatherSnapshot,
} from './types';
import {
  hashRiverWatch,
  hashManualWeather,
  hashCountryForecast,
  hashTourismWeather,
  hashThreeDayBulletin,
  hashMountaineeringWeather,
  hashCityForecasts,
  hashSpecialWeather,
  hashPressReleases,
  hashNwpModels,
  computeHash,
} from './diff';
import stationLocations from './station-locations.json';

const TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NepalWeatherEdgeBot/1.0; +https://weather.topnepali.com)',
        Accept: 'application/json, text/plain, */*',
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

const locationsMap = stationLocations as Record<string, { lat: number; lon: number; basin: string; district: string }>;

/**
 * 1. RIVER WATCH FETCHER (Enriched with exact coordinates & danger sorting)
 */
export async function fetchLiveRiverWatch(): Promise<NepalWeatherSnapshot['riverWatch']> {
  const now = Date.now();
  try {
    const res = await fetchWithTimeout('https://dhm.gov.np/site/riverWatchTableViewData', {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`DHM River Watch HTTP ${res.status}`);
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) {
      throw new Error('Invalid DHM River Watch JSON format');
    }

    const stations: RiverStation[] = [];
    const dangerStations: RiverStation[] = [];
    const warningStations: RiverStation[] = [];

    for (const item of json.data) {
      if (!item || !item.name) continue;
      const id = Number(item.id) || 0;
      const rawWl = item.waterLevel?.value ?? item.waterLevel;
      const wl = rawWl !== null && rawWl !== undefined && !isNaN(parseFloat(rawWl)) ? parseFloat(rawWl) : null;
      const wr = item.warning_level && !isNaN(parseFloat(item.warning_level)) ? parseFloat(item.warning_level) : null;
      const dl = item.danger_level && !isNaN(parseFloat(item.danger_level)) ? parseFloat(item.danger_level) : null;

      // Strictly evaluate status based on measured water level crossing warning or danger thresholds
      let status: RiverStation['status'] = 'BELOW WARNING LEVEL';
      if (wl !== null && dl !== null && wl >= dl) {
        status = 'DANGER';
      } else if (wl !== null && wr !== null && wl >= wr) {
        status = 'WARNING';
      } else {
        status = 'BELOW WARNING LEVEL';
      }

      // Enrich with static coordinate registry
      const loc = locationsMap[String(id)];
      const latitude = loc ? loc.lat : undefined;
      const longitude = loc ? loc.lon : undefined;
      const basin = item.basin ? String(item.basin).trim() : (loc?.basin || 'Unknown Basin');
      const district = item.district ? String(item.district).trim() : (loc?.district || '');

      const stationRecord: RiverStation = {
        id,
        name: String(item.name).trim(),
        stationIndex: item.stationIndex ? String(item.stationIndex).trim() : undefined,
        basin,
        district,
        latitude,
        longitude,
        waterLevel: wl,
        warningLevel: wr,
        dangerLevel: dl,
        steady: ['RISING', 'FALLING', 'STEADY'].includes(String(item.steady).toUpperCase())
          ? (String(item.steady).toUpperCase() as RiverStation['steady'])
          : '',
        status,
        measuredAt: item.waterLevel?.datetime || item.datetime || new Date().toISOString(),
      };

      stations.push(stationRecord);

      if (status === 'DANGER') {
        dangerStations.push(stationRecord);
      } else if (status === 'WARNING') {
        warningStations.push(stationRecord);
      }
    }

    const hash = await hashRiverWatch(stations);

    return {
      fetchedAt: now,
      lastCheckedAt: now,
      hash,
      totalStations: stations.length,
      dangerCount: dangerStations.length,
      warningCount: warningStations.length,
      dangerStations,
      warningStations,
      stations,
    };
  } catch (err) {
    console.warn('[Fetcher] River Watch fetch failed:', err);
    return {
      fetchedAt: now,
      lastCheckedAt: now,
      hash: '',
      totalStations: 0,
      dangerCount: 0,
      warningCount: 0,
      dangerStations: [],
      warningStations: [],
      stations: [],
    };
  }
}

/**
 * 2. WEATHER & FORECAST FETCHER
 */
export async function fetchLiveWeather(): Promise<{
  manualWeather: NepalWeatherSnapshot['manualWeather'];
  countryForecast: NepalWeatherSnapshot['countryForecast'];
}> {
  const now = Date.now();
  const [obsRes, fcRes] = await Promise.allSettled([
    fetchWithTimeout('https://dhm.gov.np/mfd/api/manual-observation').then((r) => r.json()),
    fetchWithTimeout('https://dhm.gov.np/mfd/api/country-forecast').then((r) => r.json()),
  ]);

  const manualStations: ManualWeatherStation[] = [];
  let issueDate = new Date().toISOString();
  if (obsRes.status === 'fulfilled' && obsRes.value) {
    const json = obsRes.value;
    issueDate = json.issue_date || issueDate;
    if (Array.isArray(json.stations)) {
      for (const st of json.stations) {
        if (!st || !st.name) continue;
        manualStations.push({
          id: Number(st.id) || 0,
          name: String(st.name).trim(),
          latitude: Number(st.latitude) || 0,
          longitude: Number(st.longitude) || 0,
          minTemp: st.min_temperature !== null && !isNaN(parseFloat(st.min_temperature)) ? parseFloat(st.min_temperature) : null,
          maxTemp: st.max_temperature !== null && !isNaN(parseFloat(st.max_temperature)) ? parseFloat(st.max_temperature) : null,
          rainfall24h: st.rainfall !== null && !isNaN(parseFloat(st.rainfall)) ? parseFloat(st.rainfall) : null,
        });
      }
    }
  }

  let forecastData: CountryForecast | null = null;
  if (fcRes.status === 'fulfilled' && fcRes.value) {
    const json = fcRes.value;
    if (json && (json.id || json.analysis_np)) {
      forecastData = {
        id: String(json.id || ''),
        issueDate: json.issue_date || issueDate,
        updatedAt: json.update_at || null,
        synopsisNp: String(json.analysis_np || '').trim(),
        forecastDayNp: String(json.np_text_1 || '').trim(),
        forecastNightNp: String(json.np_text_2 || '').trim(),
        forecastDayEn: json.en_text_1 ? String(json.en_text_1).trim() : undefined,
        forecastNightEn: json.en_text_2 ? String(json.en_text_2).trim() : undefined,
        specialWarningNp: json.special ? String(json.special).trim() : undefined,
      };
    }
  }

  const [weatherHash, forecastHash] = await Promise.all([
    hashManualWeather(manualStations, issueDate),
    hashCountryForecast(forecastData),
  ]);

  return {
    manualWeather: {
      fetchedAt: now,
      lastCheckedAt: now,
      hash: weatherHash,
      issueDate,
      stations: manualStations,
    },
    countryForecast: {
      fetchedAt: now,
      lastCheckedAt: now,
      hash: forecastHash,
      data: forecastData,
    },
  };
}

/**
 * 3. TOURISM & TREKKING FETCHER (Stations + Trekking Corridors)
 */
export async function fetchLiveTourism(): Promise<NepalWeatherSnapshot['tourismWeather']> {
  const now = Date.now();
  try {
    const [stationsRes, routesRes] = await Promise.allSettled([
      fetchWithTimeout('https://tourism.dhm.gov.np/api/observed-weather').then((r) => r.json()),
      fetchWithTimeout('https://tourism.dhm.gov.np/api/routes').then((r) => r.json()),
    ]);

    const stations: TourismWeatherStation[] = [];
    if (stationsRes.status === 'fulfilled' && stationsRes.value) {
      const rawList = Array.isArray(stationsRes.value.data)
        ? stationsRes.value.data
        : Array.isArray(stationsRes.value)
        ? stationsRes.value
        : [];
      for (const item of rawList) {
        if (!item || !item.name) continue;

        let temp: number | undefined;
        let humidity: number | undefined;
        let windSpeed: number | undefined;
        let rainfall: number | undefined;

        if (Array.isArray(item.observations)) {
          for (const obs of item.observations) {
            const code = String(obs.parameter_code || '').toUpperCase();
            const name = String(obs.parameter_name || '').toLowerCase();
            const lastReading = Array.isArray(obs.data) && obs.data.length > 0 ? obs.data[obs.data.length - 1] : null;
            const val = lastReading && lastReading.value !== null && !isNaN(parseFloat(lastReading.value))
              ? parseFloat(lastReading.value)
              : undefined;

            if (val !== undefined) {
              if ((code.includes('T_') || name.includes('temperature')) && temp === undefined) {
                temp = Math.round(val * 10) / 10;
              } else if ((code.includes('RH_') || name.includes('humidity')) && humidity === undefined) {
                humidity = Math.round(val);
              } else if ((code.includes('WIND') || name.includes('wind speed')) && windSpeed === undefined) {
                windSpeed = Math.round(val * 10) / 10;
              } else if ((code.includes('PCPN') || name.includes('precipitation')) && rainfall === undefined) {
                rainfall = Math.round(val * 10) / 10;
              }
            }
          }
        }

        stations.push({
          id: Number(item.id) || 0,
          name: String(item.name).trim(),
          folderName: item.folder_name ? String(item.folder_name).trim() : undefined,
          latitude: Number(item.latitude) || 0,
          longitude: Number(item.longitude) || 0,
          elevation: Number(item.elevation) || 0,
          temp,
          humidity,
          windSpeed,
          rainfall,
        });
      }
    }

    // Sort: stations with live temperatures first, then by elevation descending
    stations.sort((a, b) => {
      const aHas = a.temp !== undefined ? 1 : 0;
      const bHas = b.temp !== undefined ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return b.elevation - a.elevation;
    });

    const routes: TrekkingRoute[] = [];
    if (routesRes.status === 'fulfilled' && routesRes.value?.routes) {
      for (const r of routesRes.value.routes) {
        if (!r.name) continue;
        routes.push({
          id: String(r.id || ''),
          name: String(r.name).trim(),
          distanceKm: Number(r.distanceKm) || 0,
          startPoint: r.startPoint || [0, 0],
          endPoint: r.endPoint || [0, 0],
        });
      }
    }

    const hash = await hashTourismWeather(stations);

    return {
      fetchedAt: now,
      lastCheckedAt: now,
      hash,
      stations,
      routes,
    };
  } catch (err) {
    console.warn('[Fetcher] Tourism fetch failed:', err);
    return {
      fetchedAt: now,
      lastCheckedAt: now,
      hash: '',
      stations: [],
      routes: [],
    };
  }
}

/**
 * 4. FLOOD BULLETINS FETCHER
 */
export async function fetchLiveBulletins(): Promise<NepalWeatherSnapshot['bulletins']> {
  const now = Date.now();
  try {
    const res = await fetchWithTimeout('https://hydrology.gov.np/cm/api-public/current_forecast');
    if (!res.ok) throw new Error(`Bulletins HTTP ${res.status}`);
    const list = await res.json();
    const items: FloodBulletin[] = [];

    if (Array.isArray(list)) {
      for (const b of list.slice(0, 5)) {
        if (!b.title) continue;
        items.push({
          id: Number(b.id) || 0,
          title: String(b.title).trim(),
          fileName: b.file_name || '',
          fileUrl: b.file_name
            ? `https://hydrology.gov.np/cm/files/${encodeURIComponent(b.file_name)}`
            : 'https://hydrology.gov.np/#/current_forecast',
        });
      }
    }

    const hash = await computeHash(JSON.stringify(items.map((i) => i.id)));

    return {
      fetchedAt: now,
      lastCheckedAt: now,
      hash,
      items,
    };
  } catch (err) {
    console.warn('[Fetcher] Bulletins fetch failed:', err);
    return {
      fetchedAt: now,
      lastCheckedAt: now,
      hash: '',
      items: [],
    };
  }
}

/**
 * 5. THREE-DAY SYNOPTIC WEATHER & HAZARD BULLETIN
 */
export async function fetchLiveThreeDayBulletin(): Promise<NepalWeatherSnapshot['threeDayBulletin']> {
  const now = Date.now();
  try {
    const listRes = await fetchWithTimeout('https://dhm.gov.np/mfd/api/three-days-forecast-latest');
    if (!listRes.ok) throw new Error(`3-day forecast list HTTP ${listRes.status}`);
    const list = await listRes.json();
    if (!Array.isArray(list) || list.length === 0) {
      return { fetchedAt: now, lastCheckedAt: now, hash: '', data: null };
    }

    const latest = list[0];
    const detailRes = await fetchWithTimeout(`https://dhm.gov.np/mfd/api/three-days-forecast/${latest.id}`);
    const detail = detailRes.ok ? await detailRes.json() : {};

    const rawImages: string[] = Array.isArray(latest.images) ? latest.images : [];
    const images = rawImages.map((imgPath: string, idx: number) => {
      const fileName = imgPath.split('/').pop() || '';
      let title = `Forecast Map ${idx + 1}`;
      let day = 1;
      let time: 'day' | 'night' = 'day';

      if (fileName.includes('day_1')) {
        day = 1;
        time = idx % 2 === 0 ? 'day' : 'night';
        title = `Day 1 (${time === 'day' ? 'Afternoon' : 'Night'})`;
      } else if (fileName.includes('day_2')) {
        day = 2;
        time = idx % 2 === 0 ? 'day' : 'night';
        title = `Day 2 (${time === 'day' ? 'Afternoon' : 'Night'})`;
      } else if (fileName.includes('day_3')) {
        day = 3;
        time = idx % 2 === 0 ? 'day' : 'night';
        title = `Day 3 (${time === 'day' ? 'Afternoon' : 'Night'})`;
      }

      return {
        title,
        url: `https://dhm.gov.np/mfd/api/image/${imgPath}`,
        day,
        time,
      };
    });

    const data: ThreeDayBulletin = {
      id: String(latest.id || ''),
      issueDate: latest.issue_date || new Date().toISOString(),
      title: String(detail.title || latest.title || '').trim(),
      presentWeatherEn: detail.present_weather_en ? String(detail.present_weather_en).trim() : undefined,
      presentWeatherNp: detail.present_weather_np ? String(detail.present_weather_np).trim() : undefined,
      metAnalysisEn: detail.met_analysis_en ? String(detail.met_analysis_en).trim() : undefined,
      metAnalysisNp: detail.met_analysis_np ? String(detail.met_analysis_np).trim() : undefined,
      warningAdvisoryEn: detail.warning_advisory_en ? String(detail.warning_advisory_en).trim() : undefined,
      warningAdvisoryNp: detail.warning_advisory_np ? String(detail.warning_advisory_np).trim() : undefined,
      nationalForecastEn: detail.national_forecast_en ? String(detail.national_forecast_en).trim() : undefined,
      nationalForecastNp: detail.national_forecast_np ? String(detail.national_forecast_np).trim() : undefined,
      images,
    };

    const hash = await hashThreeDayBulletin(data);
    return { fetchedAt: now, lastCheckedAt: now, hash, data };
  } catch (err) {
    console.warn('[Fetcher] 3-Day Bulletin fetch failed:', err);
    return { fetchedAt: now, lastCheckedAt: now, hash: '', data: null };
  }
}

/**
 * 6. MOUNTAINEERING & EXPEDITION WEATHER FORECAST (3,000m - 9,000m)
 */
const MOUNTAIN_DIVISIONS_MAP: Record<number, { name: string; nepali: string }> = {
  1: { name: 'Koshi Province (Everest / Makalu / Kanchenjunga)', nepali: 'कोशी प्रदेश (सगरमाथा/मकालु/कञ्चनजङ्घा)' },
  3: { name: 'Bagmati Province (Langtang / Gaurishankar)', nepali: 'बागमती प्रदेश (लाङटाङ/गौरीशङ्कर)' },
  4: { name: 'Gandaki Province (Annapurna / Manaslu / Dhaulagiri)', nepali: 'गण्डकी प्रदेश (अन्नपूर्ण/मनास्लु/धौलागिरी)' },
  6: { name: 'Karnali Province (Kanjiroba / Saipal)', nepali: 'कर्णाली प्रदेश (कान्जीरोवा/सैपाल)' },
  7: { name: 'Sudurpaschim Province (Api / Nampa)', nepali: 'सुदूरपश्चिम प्रदेश (अपि/नाम्पा)' },
};

export async function fetchLiveMountaineering(): Promise<NepalWeatherSnapshot['mountaineeringWeather']> {
  const now = Date.now();
  try {
    const res = await fetchWithTimeout('https://dhm.gov.np/mfd/api/mountain');
    if (!res.ok) throw new Error(`Mountaineering HTTP ${res.status}`);
    const json = await res.json();
    const issueDate = json.issue_date || new Date().toISOString();
    const forecastTextList = Array.isArray(json.forecast_text) ? json.forecast_text : [];
    const forecastData = json.forecast_data || {};

    const divisions: MountainForecastDivision[] = [];
    const altitudeLevels = [
      { key: 'altitude_1', m: 3000 },
      { key: 'altitude_2', m: 5500 },
      { key: 'altitude_3', m: 7000 },
      { key: 'altitude_4', m: 9000 },
    ];

    for (const [divIdStr, info] of Object.entries(MOUNTAIN_DIVISIONS_MAP)) {
      const divId = Number(divIdStr);
      const textItem = forecastTextList.find((t: any) => Number(t.division_id) === divId);
      const conditions: string[] = Array.isArray(textItem?.text) ? textItem.text : [];

      const altitudes = altitudeLevels.map((alt) => {
        const altData = forecastData[alt.key]?.[`division_${divId}`];
        return {
          altitudeM: alt.m,
          windDirectionDeg: altData?.parameter_1 !== undefined ? Number(altData.parameter_1) : null,
          windSpeedKt: altData?.parameter_2 !== undefined ? Number(altData.parameter_2) : null,
          tempC: altData?.parameter_3 !== undefined ? Number(altData.parameter_3) : null,
        };
      });

      divisions.push({
        divisionId: divId,
        provinceName: info.name,
        provinceNepali: info.nepali,
        conditions,
        altitudes,
      });
    }

    const data: MountaineeringWeather = { issueDate, divisions };
    const hash = await hashMountaineeringWeather(data);
    return { fetchedAt: now, lastCheckedAt: now, hash, data };
  } catch (err) {
    console.warn('[Fetcher] Mountaineering fetch failed:', err);
    return { fetchedAt: now, lastCheckedAt: now, hash: '', data: null };
  }
}

/**
 * 7. CITY MULTI-DAY WEATHER FORECASTS (19 Major Hubs)
 */
export async function fetchLiveCityForecasts(): Promise<NepalWeatherSnapshot['cityForecasts']> {
  const now = Date.now();
  try {
    const res = await fetchWithTimeout('https://dhm.gov.np/mfd/api/weather');
    if (!res.ok) throw new Error(`City weather HTTP ${res.status}`);
    const json = await res.json();
    const stations: CityForecastStation[] = [];

    if (Array.isArray(json.stations)) {
      for (const st of json.stations) {
        if (!st.name) continue;
        const forecasts: CityForecastDay[] = [];
        const rawForecasts = Array.isArray(st.manual_forecast) ? st.manual_forecast : [];

        for (const f of rawForecasts) {
          forecasts.push({
            day: Number(f.day) || 1,
            fromTemp: f.from_temperature !== null && f.from_temperature !== undefined ? Number(f.from_temperature) : null,
            toTemp: f.to_temperature !== null && f.to_temperature !== undefined ? Number(f.to_temperature) : null,
            rainProbability: Number(f.rain_probability) || 0,
            weatherName: f.weather?.name ? String(f.weather.name).trim() : 'Fair',
            weatherNepali: f.weather?.nepali_name ? String(f.weather.nepali_name).trim() : 'सफा',
            dayIcon: f.weather?.day_icon ? `https://dhm.gov.np/mfd/api/image/${f.weather.day_icon}` : undefined,
            nightIcon: f.weather?.night_icon ? `https://dhm.gov.np/mfd/api/image/${f.weather.night_icon}` : undefined,
          });
        }

        stations.push({
          id: Number(st.id) || 0,
          name: String(st.name).trim(),
          nepaliName: st.nepali_name ? String(st.nepali_name).trim() : String(st.name).trim(),
          latitude: Number(st.latitude) || 0,
          longitude: Number(st.longitude) || 0,
          sunrise: st.sunrise ? String(st.sunrise).trim() : undefined,
          sunset: st.sunset ? String(st.sunset).trim() : undefined,
          forecasts,
        });
      }
    }

    const hash = await hashCityForecasts(stations);
    return { fetchedAt: now, lastCheckedAt: now, hash, stations };
  } catch (err) {
    console.warn('[Fetcher] City forecasts fetch failed:', err);
    return { fetchedAt: now, lastCheckedAt: now, hash: '', stations: [] };
  }
}

/**
 * 8. SPECIAL WEATHER ADVISORIES & HAZARD WARNINGS (https://dhm.gov.np/mfd/#/weather/pages/special-weather/)
 */
export async function fetchLiveSpecialWeather(): Promise<NepalWeatherSnapshot['specialWeather']> {
  const now = Date.now();
  try {
    const [recentRes, popupRes] = await Promise.all([
      fetchWithTimeout('https://dhm.gov.np/mfd/api/recent-page').catch(() => null),
      fetchWithTimeout('https://dhm.gov.np/mfd/api/popup-active').catch(() => null),
    ]);

    let activeNotice: EmergencyNotice | null = null;
    if (popupRes && popupRes.ok) {
      const popups = await popupRes.json();
      if (Array.isArray(popups) && popups.length > 0) {
        const p = popups[0];
        activeNotice = {
          id: String(p.id || ''),
          title: String(p.title || '').trim(),
          nepaliTitle: p.nepali_title ? String(p.nepali_title).trim() : undefined,
          url: p.url ? String(p.url).trim() : undefined,
          createdAt: p.create_at ? String(p.create_at) : undefined,
        };
      }
    }

    const items: SpecialWeatherAdvisory[] = [];
    if (recentRes && recentRes.ok) {
      const recentList = await recentRes.json();
      if (Array.isArray(recentList)) {
        // Fetch full detail with warning maps for top 3 items
        const topSlice = recentList.slice(0, 8);
        for (let i = 0; i < topSlice.length; i++) {
          const item = topSlice[i];
          let detailData: any = {};
          if (i < 3 && item.id) {
            try {
              const dRes = await fetchWithTimeout(`https://dhm.gov.np/mfd/api/page/${item.id}`);
              if (dRes.ok) detailData = await dRes.json();
            } catch {}
          }

          const rawImages = detailData.weather_map_images || item.weather_map_images || [];
          const weatherMapImages = Array.isArray(rawImages)
            ? rawImages.map((m: any) => ({
                filepath: m.filepath,
                weatherTypeId: m.weather_type_id,
                weatherTypeDayId: m.weather_type_day_id,
                url: `https://dhm.gov.np/mfd/api/image/${m.filepath}`,
              }))
            : [];

          items.push({
            id: String(item.id || ''),
            title: String(item.title || detailData.title || '').trim(),
            description: item.description ? String(item.description).trim() : undefined,
            content: detailData.content ? String(detailData.content).trim() : undefined,
            createdAt: item.create_at || detailData.create_at || new Date().toISOString(),
            issueDate: detailData.issue_date || item.issue_date,
            weatherMapImages: weatherMapImages.length > 0 ? weatherMapImages : undefined,
          });
        }
      }
    }

    const hash = await hashSpecialWeather({ items, activeNotice });
    return { fetchedAt: now, lastCheckedAt: now, hash, items, activeNotice };
  } catch (err) {
    console.warn('[Fetcher] Special weather fetch failed:', err);
    return { fetchedAt: now, lastCheckedAt: now, hash: '', items: [], activeNotice: null };
  }
}

/**
 * 9. OFFICIAL DHM PRESS RELEASES (https://dhm.gov.np/pressrelease)
 */
export async function fetchLivePressReleases(): Promise<NepalWeatherSnapshot['pressReleases']> {
  const now = Date.now();
  try {
    const res = await fetchWithTimeout('https://dhm.gov.np/pressrelease');
    if (!res.ok) throw new Error(`Press release list HTTP ${res.status}`);
    const html = await res.text();

    const re = /href=["'](https:\/\/dhm\.gov\.np\/pressrelease_detail\/(\d+)\/\d+)["'][^>]*>[\s\S]*?<h6>([^<]+)<\/h6>(?:[\s\S]*?<p>([^<]+)<\/p>)?/g;
    let m;
    const items: DhmPressRelease[] = [];
    while ((m = re.exec(html)) !== null && items.length < 12) {
      items.push({
        url: m[1],
        id: m[2],
        title: m[3].trim(),
        subtitle: m[4] ? m[4].trim() : undefined,
      });
    }

    // Enhance top 3 items with direct PDF links & dates
    for (let i = 0; i < Math.min(3, items.length); i++) {
      try {
        const detailRes = await fetchWithTimeout(items[i].url);
        if (detailRes.ok) {
          const detailHtml = await detailRes.text();
          const pdfMatch = detailHtml.match(/href=["'](https:\/\/dhm\.gov\.np\/uploads\/dhm\/pressrelease\/[^"']+\.pdf)["']/i);
          const dateMatch = detailHtml.match(/(\d{2}\/\d{2}\/\d{4})/);
          if (pdfMatch && pdfMatch[1]) items[i].pdfUrl = pdfMatch[1];
          if (dateMatch && dateMatch[1]) items[i].date = dateMatch[1];
        }
      } catch {}
    }

    const hash = await hashPressReleases(items);
    return { fetchedAt: now, lastCheckedAt: now, hash, items };
  } catch (err) {
    console.warn('[Fetcher] Press releases fetch failed:', err);
    return { fetchedAt: now, lastCheckedAt: now, hash: '', items: [] };
  }
}

/**
 * 10. NUMERICAL WEATHER PREDICTION (NWP) / WRF MODELS (https://dhm.gov.np/mfd/#/nwp)
 */
export async function fetchLiveNwpModels(): Promise<NepalWeatherSnapshot['nwpModels']> {
  const now = Date.now();
  try {
    const res = await fetchWithTimeout('https://dhm.gov.np/mfd/api/wms-forecast');
    if (!res.ok) throw new Error(`NWP models HTTP ${res.status}`);
    const json = await res.json();
    const models: NwpModelInfo[] = [];

    if (Array.isArray(json)) {
      for (const m of json) {
        models.push({
          name: String(m.name || ''),
          workspace: String(m.workspace || 'NWP'),
          layers: Array.isArray(m.layers) ? m.layers : [],
          wmsUrl: 'https://dhm.gov.np/mfd/geoserver/NWP/wms',
        });
      }
    }

    const hash = await hashNwpModels(models);
    return { fetchedAt: now, lastCheckedAt: now, hash, models };
  } catch (err) {
    console.warn('[Fetcher] NWP models fetch failed:', err);
    return { fetchedAt: now, lastCheckedAt: now, hash: '', models: [] };
  }
}

/**
 * 11. AGGREGATOR
 */
export async function fetchLiveNepalWeatherSnapshot(): Promise<NepalWeatherSnapshot> {
  const now = Date.now();
  const [
    riverWatch,
    weatherData,
    tourismWeather,
    bulletins,
    threeDayBulletin,
    specialWeather,
    pressReleases,
    nwpModels,
    mountaineeringWeather,
    cityForecasts,
  ] = await Promise.all([
    fetchLiveRiverWatch(),
    fetchLiveWeather(),
    fetchLiveTourism(),
    fetchLiveBulletins(),
    fetchLiveThreeDayBulletin(),
    fetchLiveSpecialWeather(),
    fetchLivePressReleases(),
    fetchLiveNwpModels(),
    fetchLiveMountaineering(),
    fetchLiveCityForecasts(),
  ]);

  return {
    version: 5,
    fetchedAt: now,
    lastCheckedAt: now,
    source: 'upstream',
    riverWatch,
    manualWeather: weatherData.manualWeather,
    countryForecast: weatherData.countryForecast,
    tourismWeather,
    bulletins,
    threeDayBulletin,
    specialWeather,
    pressReleases,
    nwpModels,
    mountaineeringWeather,
    cityForecasts,
  };
}
