export interface RiverStation {
  id: number;
  name: string;
  stationIndex?: string;
  basin: string;
  district: string;
  latitude?: number;
  longitude?: number;
  waterLevel: number | null;
  warningLevel: number | null;
  dangerLevel: number | null;
  steady: 'RISING' | 'FALLING' | 'STEADY' | '';
  status: 'BELOW WARNING LEVEL' | 'WARNING' | 'DANGER' | 'NORMAL';
  measuredAt: string;
}

export interface ManualWeatherStation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  minTemp: number | null;
  maxTemp: number | null;
  rainfall24h: number | null;
}

export interface CountryForecast {
  id: string;
  issueDate: string;
  updatedAt: string | null;
  synopsisNp: string;
  forecastDayNp: string;
  forecastNightNp: string;
  forecastDayEn?: string;
  forecastNightEn?: string;
  specialWarningNp?: string;
}

export interface TourismWeatherStation {
  id: number;
  name: string;
  folderName?: string;
  latitude: number;
  longitude: number;
  elevation: number;
  temp?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  rainfall?: number;
  summary?: string;
}

export interface FloodBulletin {
  id: number;
  title: string;
  fileName: string;
  fileUrl: string;
}

export interface TrekkingRoute {
  id: string;
  name: string;
  distanceKm: number;
  startPoint: [number, number];
  endPoint: [number, number];
}

export interface ThreeDayBulletin {
  id: string;
  issueDate: string;
  title: string;
  presentWeatherEn?: string;
  presentWeatherNp?: string;
  metAnalysisEn?: string;
  metAnalysisNp?: string;
  warningAdvisoryEn?: string;
  warningAdvisoryNp?: string;
  nationalForecastEn?: string;
  nationalForecastNp?: string;
  images: {
    title: string;
    url: string;
    day?: number;
    time?: 'day' | 'night';
  }[];
}

export interface MountainForecastDivision {
  divisionId: number;
  provinceName: string;
  provinceNepali: string;
  conditions: string[];
  altitudes: {
    altitudeM: number;
    windDirectionDeg: number | null;
    windSpeedKt: number | null;
    tempC: number | null;
  }[];
}

export interface MountaineeringWeather {
  issueDate: string;
  divisions: MountainForecastDivision[];
}

export interface CityForecastDay {
  day: number;
  fromTemp: number | null;
  toTemp: number | null;
  rainProbability: number;
  weatherName: string;
  weatherNepali: string;
  dayIcon?: string;
  nightIcon?: string;
}

export interface CityForecastStation {
  id: number;
  name: string;
  nepaliName: string;
  latitude: number;
  longitude: number;
  sunrise?: string;
  sunset?: string;
  forecasts: CityForecastDay[];
}

export interface SpecialWeatherAdvisory {
  id: string;
  title: string;
  description?: string;
  content?: string;
  createdAt: string;
  issueDate?: string;
  weatherMapImages?: {
    filepath: string;
    weatherTypeId?: number;
    weatherTypeDayId?: number;
    url: string;
  }[];
}

export interface DhmPressRelease {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  pdfUrl?: string;
  imageUrl?: string;
  url: string;
}

export interface NwpModelInfo {
  name: string;
  workspace: string;
  layers: string[];
  wmsUrl: string;
}

export interface EmergencyNotice {
  id: string;
  title: string;
  nepaliTitle?: string;
  url?: string;
  createdAt?: string;
}

export type RefreshScope =
  | 'river'
  | 'weather'
  | 'tourism'
  | 'bulletin'
  | 'mountain'
  | 'cities'
  | 'special'
  | 'press'
  | 'nwp'
  | 'all';

export interface DomainMeta {
  fetchedAt: number;
  lastCheckedAt: number;
  hash: string;
}

export interface NepalWeatherSnapshot {
  version: number;
  fetchedAt: number;
  lastCheckedAt: number;
  source: 'upstream' | 'cached';
  riverWatch: DomainMeta & {
    totalStations: number;
    dangerCount: number;
    warningCount: number;
    dangerStations: RiverStation[];
    warningStations: RiverStation[];
    stations: RiverStation[];
  };
  manualWeather: DomainMeta & {
    issueDate: string;
    stations: ManualWeatherStation[];
  };
  countryForecast: DomainMeta & {
    data: CountryForecast | null;
  };
  tourismWeather: DomainMeta & {
    stations: TourismWeatherStation[];
    routes: TrekkingRoute[];
  };
  bulletins: DomainMeta & {
    items: FloodBulletin[];
  };
  threeDayBulletin: DomainMeta & {
    data: ThreeDayBulletin | null;
  };
  specialWeather: DomainMeta & {
    items: SpecialWeatherAdvisory[];
    activeNotice: EmergencyNotice | null;
  };
  pressReleases: DomainMeta & {
    items: DhmPressRelease[];
  };
  nwpModels: DomainMeta & {
    models: NwpModelInfo[];
  };
  mountaineeringWeather: DomainMeta & {
    data: MountaineeringWeather | null;
  };
  cityForecasts: DomainMeta & {
    stations: CityForecastStation[];
  };
}

export interface RefreshResult {
  status: 'throttled' | 'updated' | 'unchanged' | 'error';
  scope: RefreshScope;
  message: string;
  cooldownRemainingMinutes: number;
  lastFetchedAt: number;
  lastCheckedAt: number;
  snapshot: NepalWeatherSnapshot;
}
