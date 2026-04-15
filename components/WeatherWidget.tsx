'use client';

import { useEffect, useState } from 'react';
import { WeatherData } from '@/lib/types';
import { getWindDirection, formatTime } from '@/lib/weather';
import { Icon } from './Icon';

const WMO_ICON: Record<number, string> = {
  0: 'sunny', 1: 'partly_cloudy_day', 2: 'partly_cloudy_day', 3: 'cloud',
  45: 'foggy', 48: 'foggy',
  51: 'grain', 53: 'grain', 55: 'grain',
  61: 'rainy', 63: 'rainy', 65: 'rainy',
  71: 'weather_snowy', 73: 'weather_snowy', 75: 'weather_snowy',
  80: 'rainy', 81: 'rainy', 82: 'rainy',
  85: 'weather_snowy', 86: 'weather_snowy',
  95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm',
};

interface Props {
  lat: number;
  lon: number;
}

export function WeatherWidget({ lat, lon }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(d => { if (d.current) setWeather(d); else setErr(true); })
      .catch(() => setErr(true));
  }, [lat, lon]);

  if (err) return null;
  if (!weather) return (
    <div className="bg-surface-low rounded-2xl p-3 flex items-center gap-2 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-surface-high" />
      <div className="h-4 w-24 rounded bg-surface-high" />
    </div>
  );

  const c = weather.current;
  const today = weather.daily[0];
  const icon = WMO_ICON[c.weatherCode] ?? 'cloud';

  const sunrise = today?.sunrise ? formatTime(today.sunrise) : null;
  const sunset  = today?.sunset  ? formatTime(today.sunset)  : null;
  const windDir = getWindDirection(c.windDirection);

  return (
    <div className="bg-surface-low rounded-2xl px-4 py-3 flex items-center gap-4 fade-up">
      {/* Weather icon + temp */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Icon name={icon} filled className="text-2xl text-primary" />
        <span className="font-display font-bold text-on-surface text-lg">{c.temperature}°</span>
        <span className="text-xs text-on-variant">/{c.apparentTemperature}°</span>
      </div>

      {/* Wind */}
      <div className="flex items-center gap-1.5 text-sm text-on-variant">
        <Icon name="air" className="text-base text-on-variant" />
        <span className="font-semibold">{c.windSpeed} m/s {windDir}</span>
      </div>

      {/* Sunrise / Sunset */}
      {sunrise && sunset && (
        <div className="flex items-center gap-2 text-xs text-on-variant ml-auto flex-shrink-0">
          <Icon name="wb_twilight" className="text-sm text-on-variant" />
          <span>{sunrise}</span>
          <span className="text-outline-v">·</span>
          <span>{sunset}</span>
        </div>
      )}
    </div>
  );
}
