// ── Course ──────────────────────────────────────────────────────────────────
export interface Course {
  id: string;
  name: string;
  shortName?: string;
  location?: string;
  region?: string;
  description?: string;
  lat?: number;
  lon?: number;
  holes?: number;
  logoUrl?: string;
  // from GolfCourseAPI
  club_name?: string;
  city?: string;
  [key: string]: unknown; // allow extra fields from API responses
}

export type PlayabilityStatus = 'Playable' | 'Chilly' | 'Wind Advisory' | 'Arctic Exposure' | 'Loading';

// ── Weather ─────────────────────────────────────────────────────────────────
export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  weatherCode: number;
  humidity: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitationProbability: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  maxTemp: number;
  minTemp: number;
  precipitationProbability: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

// ── Round ────────────────────────────────────────────────────────────────────
export interface HoleData {
  hole: number;
  par: number;
  handicap?: number;
  yardage?: number;   // total hole length in metres from white/middle tee
  score: number | null;
  putts: number;
  fairway: 'hit' | 'left' | 'right' | null;
  gir: boolean;
  pinLat?: number;
  pinLon?: number;
}

export interface ShotRecord {
  hole: number;
  dist: number;
  ts: number;
}

export interface Round {
  id: number;
  courseId: string;
  courseName: string;
  courseLocation?: string;
  courseLat?: number;
  courseLon?: number;
  holes: HoleData[];
  currentHole: number;
  totalScore: number;
  totalPutts: number;
  shots: ShotRecord[];
  startedAt: number;
  finishedAt?: number;
  finished: boolean;
}

// ── Settings ─────────────────────────────────────────────────────────────────
export interface AppSettings {
  name: string;
  handicap: number;
  antKey: string;
  gcaKey: string;
}
