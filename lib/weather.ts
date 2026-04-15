import { WeatherData, CurrentWeather, HourlyForecast, DailyForecast, PlayabilityStatus } from './types';

// ---------------------------------------------------------------------------
// met.no (yr.no) — Norwegian Meteorological Institute
// Uses the HARMONIE-AROME Arctic model, optimised for Iceland & North Atlantic
// Docs: https://api.met.no/weatherapi/locationforecast/2.0/documentation
// ---------------------------------------------------------------------------
const MET_NO_BASE = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const MET_NO_USER_AGENT = 'Golfvedur/1.0 (https://github.com/MrMagnusson/Golfvedur)';

// ---------------------------------------------------------------------------
// Symbol code → app representation
// met.no uses symbol strings; we map to WMO-equivalent codes so the rest of
// the app (icons, playability logic) doesn't need to change.
// ---------------------------------------------------------------------------
interface SymbolInfo { label: string; icon: string; wmoCode: number }

const SYMBOL_CODES: Record<string, SymbolInfo> = {
  clearsky:            { label: 'Clear sky',             icon: 'sunny',           wmoCode: 0  },
  fair:                { label: 'Mainly clear',           icon: 'partly_cloudy_day', wmoCode: 1 },
  partlycloudy:        { label: 'Partly cloudy',          icon: 'partly_cloudy_day', wmoCode: 2 },
  cloudy:              { label: 'Overcast',               icon: 'cloud',           wmoCode: 3  },
  fog:                 { label: 'Fog',                    icon: 'foggy',           wmoCode: 45 },
  lightrain:           { label: 'Light rain',             icon: 'rainy',           wmoCode: 61 },
  rain:                { label: 'Rain',                   icon: 'rainy',           wmoCode: 63 },
  heavyrain:           { label: 'Heavy rain',             icon: 'rainy',           wmoCode: 65 },
  lightrainshowers:    { label: 'Light showers',          icon: 'rainy',           wmoCode: 80 },
  rainshowers:         { label: 'Showers',                icon: 'rainy',           wmoCode: 81 },
  heavyrainshowers:    { label: 'Heavy showers',          icon: 'rainy',           wmoCode: 82 },
  lightsleet:          { label: 'Light sleet',            icon: 'grain',           wmoCode: 61 },
  sleet:               { label: 'Sleet',                  icon: 'grain',           wmoCode: 63 },
  heavysleet:          { label: 'Heavy sleet',            icon: 'grain',           wmoCode: 65 },
  lightsleetshowers:   { label: 'Light sleet showers',   icon: 'grain',           wmoCode: 80 },
  sleetshowers:        { label: 'Sleet showers',          icon: 'grain',           wmoCode: 81 },
  heavysleetshowers:   { label: 'Heavy sleet showers',   icon: 'grain',           wmoCode: 82 },
  lightsnow:           { label: 'Light snow',             icon: 'weather_snowy',   wmoCode: 71 },
  snow:                { label: 'Snow',                   icon: 'weather_snowy',   wmoCode: 73 },
  heavysnow:           { label: 'Heavy snow',             icon: 'weather_snowy',   wmoCode: 75 },
  lightsnowshowers:    { label: 'Light snow showers',     icon: 'weather_snowy',   wmoCode: 85 },
  snowshowers:         { label: 'Snow showers',           icon: 'weather_snowy',   wmoCode: 85 },
  heavysnowshowers:    { label: 'Heavy snow showers',     icon: 'weather_snowy',   wmoCode: 86 },
  thunderstorm:        { label: 'Thunderstorm',           icon: 'thunderstorm',    wmoCode: 95 },
  lightrainandthunder: { label: 'Thunderstorm',           icon: 'thunderstorm',    wmoCode: 95 },
  rainandthunder:      { label: 'Thunderstorm',           icon: 'thunderstorm',    wmoCode: 95 },
  sleetandthunder:     { label: 'Sleet & thunder',        icon: 'thunderstorm',    wmoCode: 95 },
  snowandthunder:      { label: 'Snow & thunder',         icon: 'thunderstorm',    wmoCode: 99 },
  lightsnoWandthunder: { label: 'Snow & thunder',         icon: 'thunderstorm',    wmoCode: 99 },
};

// Keep WMO_CODES for any components that still reference it
export const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0:  { label: 'Clear sky',          icon: 'sunny'           },
  1:  { label: 'Mainly clear',       icon: 'partly_cloudy_day' },
  2:  { label: 'Partly cloudy',      icon: 'partly_cloudy_day' },
  3:  { label: 'Overcast',           icon: 'cloud'           },
  45: { label: 'Fog',                icon: 'foggy'           },
  48: { label: 'Rime fog',           icon: 'foggy'           },
  51: { label: 'Light drizzle',      icon: 'grain'           },
  53: { label: 'Drizzle',            icon: 'grain'           },
  55: { label: 'Heavy drizzle',      icon: 'grain'           },
  61: { label: 'Light rain',         icon: 'rainy'           },
  63: { label: 'Rain',               icon: 'rainy'           },
  65: { label: 'Heavy rain',         icon: 'rainy'           },
  71: { label: 'Light snow',         icon: 'weather_snowy'   },
  73: { label: 'Snow',               icon: 'weather_snowy'   },
  75: { label: 'Heavy snow',         icon: 'weather_snowy'   },
  77: { label: 'Snow grains',        icon: 'weather_snowy'   },
  80: { label: 'Light showers',      icon: 'rainy'           },
  81: { label: 'Showers',            icon: 'rainy'           },
  82: { label: 'Heavy showers',      icon: 'rainy'           },
  85: { label: 'Snow showers',       icon: 'weather_snowy'   },
  86: { label: 'Heavy snow showers', icon: 'weather_snowy'   },
  95: { label: 'Thunderstorm',       icon: 'thunderstorm'    },
  96: { label: 'Thunderstorm w/ hail', icon: 'thunderstorm'  },
  99: { label: 'Heavy thunderstorm', icon: 'thunderstorm'    },
};

function parseSymbol(symbolCode: string): SymbolInfo {
  // Strip _day / _night / _polartwilight suffixes
  const base = symbolCode.replace(/_(day|night|polartwilight)$/, '');
  return SYMBOL_CODES[base] ?? SYMBOL_CODES[symbolCode] ?? { label: 'Unknown', icon: 'help', wmoCode: 3 };
}

// Wind chill / apparent temperature (°C, m/s)
function apparentTemp(tempC: number, windMs: number): number {
  if (tempC < 10 && windMs > 1.3) {
    const v = windMs * 3.6; // km/h
    return Math.round(13.12 + 0.6215 * tempC - 11.37 * v ** 0.16 + 0.3965 * tempC * v ** 0.16);
  }
  return Math.round(tempC);
}

// ---------------------------------------------------------------------------
// Astronomical sunrise / sunset  (accurate to ~1 min for Iceland latitudes)
// ---------------------------------------------------------------------------
function sunriseSunset(lat: number, lon: number, dateStr: string): { sunrise: string; sunset: string } {
  const date = new Date(dateStr + 'T12:00:00Z');
  const J = date.getTime() / 86400000 + 2440587.5;
  const n = Math.ceil(J - 2451545.0 + 0.5);

  const M = ((357.5291 + 0.98560028 * n) % 360 + 360) % 360;
  const Mr = (M * Math.PI) / 180;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = ((M + C + 180 + 102.9372) % 360 + 360) % 360;
  const lr = (lambda * Math.PI) / 180;

  const Jtransit = 2451545.0 + n + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lr);

  const sinDec = Math.sin(lr) * Math.sin((23.4397 * Math.PI) / 180);
  const cosDec = Math.cos(Math.asin(sinDec));
  const latR = (lat * Math.PI) / 180;

  const cosOmega =
    (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(latR) * sinDec) /
    (Math.cos(latR) * cosDec);

  const jToIso = (j: number) => new Date((j - 2440587.5) * 86400000).toISOString();

  // Polar night / midnight sun
  if (cosOmega > 1) return { sunrise: dateStr + 'T12:00:00Z', sunset: dateStr + 'T12:00:00Z' };
  if (cosOmega < -1) return { sunrise: dateStr + 'T00:00:00Z', sunset: dateStr + 'T23:59:59Z' };

  const omega = (Math.acos(cosOmega) * 180) / Math.PI;
  return {
    sunrise: jToIso(Jtransit - omega / 360),
    sunset:  jToIso(Jtransit + omega / 360),
  };
}

// ---------------------------------------------------------------------------
// Public helpers (unchanged API — used by components)
// ---------------------------------------------------------------------------
export function getWeatherInfo(code: number): { label: string; icon: string } {
  return WMO_CODES[code] ?? { label: 'Unknown', icon: 'help' };
}

export function getPlayabilityStatus(weather: CurrentWeather): PlayabilityStatus {
  const { temperature, windSpeed, weatherCode } = weather;
  const isSnow    = [71, 73, 75, 77, 85, 86].includes(weatherCode);
  const isHeavyRain = [65, 82].includes(weatherCode);
  const isThunder = [95, 96, 99].includes(weatherCode);

  if (temperature < 0 || windSpeed > 15 || isSnow || isThunder) return 'Arctic Exposure';
  if (windSpeed > 10 || isHeavyRain) return 'Wind Advisory';
  if (temperature < 5 || windSpeed > 8)  return 'Chilly';
  return 'Playable';
}

export function getPlayabilityColor(status: PlayabilityStatus): string {
  switch (status) {
    case 'Playable':       return 'bg-primary-container/80 text-primary';
    case 'Chilly':         return 'bg-tertiary-container/80 text-tertiary';
    case 'Wind Advisory':  return 'bg-tertiary-container/80 text-tertiary';
    case 'Arctic Exposure':return 'bg-tertiary-container/80 text-tertiary';
    default:               return 'bg-surface-container-highest text-on-surface-variant';
  }
}

export function getWindDirection(degrees: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degrees / 45) % 8];
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Atlantic/Reykjavik',
  });
}

export function formatDay(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    timeZone: 'Atlantic/Reykjavik',
  });
}

export function getDaylightDuration(sunrise: string, sunset: string): string {
  const ms = new Date(sunset).getTime() - new Date(sunrise).getTime();
  const hours   = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

// ---------------------------------------------------------------------------
// Main fetch — met.no locationforecast/2.0/compact
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Timeslot = Record<string, any>;

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `${MET_NO_BASE}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': MET_NO_USER_AGENT },
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`met.no error ${res.status}`);

  const data = await res.json();
  const ts: Timeslot[] = data.properties.timeseries;

  // ── Current conditions ──────────────────────────────────────────────────
  const nowMs = Date.now();
  const current1 = ts.reduce((best: Timeslot, entry: Timeslot) => {
    const d = Math.abs(new Date(entry.time).getTime() - nowMs);
    return d < Math.abs(new Date(best.time).getTime() - nowMs) ? entry : best;
  });

  const inst = current1.data.instant.details;
  const n1h  = current1.data.next_1_hours ?? current1.data.next_6_hours;
  const curSym = parseSymbol(n1h?.summary?.symbol_code ?? 'cloudy');

  const current: CurrentWeather = {
    temperature:         Math.round(inst.air_temperature),
    apparentTemperature: apparentTemp(inst.air_temperature, inst.wind_speed),
    windSpeed:           Math.round(inst.wind_speed * 10) / 10,
    windDirection:       inst.wind_from_direction,
    precipitation:       n1h?.details?.precipitation_amount ?? 0,
    weatherCode:         curSym.wmoCode,
    humidity:            Math.round(inst.relative_humidity ?? 0),
  };

  // ── Hourly (full 7-day window) ───────────────────────────────────────────
  // met.no gives 1-hourly data for ~48 h, then 6-hourly beyond that.
  // We keep all slots so the detail page can show per-day breakdowns.
  const hourly: HourlyForecast[] = ts
    .filter((e: Timeslot) => {
      const t = new Date(e.time).getTime();
      const hasData = e.data.next_1_hours ?? e.data.next_6_hours;
      return t >= nowMs && hasData;
    })
    .map((e: Timeslot) => {
      const d   = e.data.instant.details;
      const n1  = e.data.next_1_hours ?? e.data.next_6_hours;
      const sym = parseSymbol(n1?.summary?.symbol_code ?? 'cloudy');
      return {
        time:                     e.time,
        temperature:              Math.round(d.air_temperature),
        precipitationProbability: Math.round(n1?.details?.probability_of_precipitation ?? 0),
        windSpeed:                Math.round(d.wind_speed * 10) / 10,
        windDirection:            d.wind_from_direction,
        weatherCode:              sym.wmoCode,
      };
    });

  // ── Daily (7 days) ──────────────────────────────────────────────────────
  // Group by Iceland date (UTC = Reykjavik time)
  const byDay = new Map<string, Timeslot[]>();
  for (const e of ts) {
    const day = e.time.slice(0, 10);
    const arr = byDay.get(day) ?? [];
    arr.push(e);
    byDay.set(day, arr);
  }

  const daily: DailyForecast[] = [...byDay.entries()].slice(0, 7).map(([dateStr, entries]) => {
    const temps  = entries.map((e: Timeslot) => e.data.instant.details.air_temperature as number);
    const winds  = entries.map((e: Timeslot) => e.data.instant.details.wind_speed as number);
    const maxTemp = Math.round(Math.max(...temps));
    const minTemp = Math.round(Math.min(...temps));
    const maxWind = Math.round(Math.max(...winds) * 10) / 10;

    // Representative symbol: prefer the T12:00 slot, else midpoint
    const midday = entries.find((e: Timeslot) => e.time.includes('T12:00:00')) ??
                   entries[Math.floor(entries.length / 2)];
    const reprSlot = midday?.data?.next_1_hours ?? midday?.data?.next_6_hours ?? midday?.data?.next_12_hours;
    const daySym = parseSymbol(reprSlot?.summary?.symbol_code ?? 'cloudy');

    const precipProbs = entries.map((e: Timeslot) =>
      e.data?.next_1_hours?.details?.probability_of_precipitation ??
      e.data?.next_6_hours?.details?.probability_of_precipitation ?? 0
    );
    const maxPrecip = Math.round(Math.max(...precipProbs));

    const { sunrise, sunset } = sunriseSunset(lat, lon, dateStr);

    return {
      date:                    dateStr,
      weatherCode:             daySym.wmoCode,
      maxTemp,
      minTemp,
      precipitationProbability: maxPrecip,
      windSpeedMax:            maxWind,
      sunrise,
      sunset,
    };
  });

  return { current, hourly, daily };
}
