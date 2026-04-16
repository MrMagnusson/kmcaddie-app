'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { Icon } from '@/components/Icon';
import { Course, Round, AppSettings } from '@/lib/types';
import { COURSES, getDistanceKm } from '@/lib/courses';
import { getSettings, getRounds, saveActiveRound } from '@/lib/storage';
import { getPlayabilityStatus } from '@/lib/weather';

const WMO_ICON: Record<number, string> = {
  0: 'sunny', 1: 'partly_cloudy_day', 2: 'partly_cloudy_day', 3: 'cloud',
  45: 'foggy', 61: 'rainy', 63: 'rainy', 65: 'rainy',
  71: 'weather_snowy', 73: 'weather_snowy', 80: 'rainy', 81: 'rainy',
  95: 'thunderstorm',
};

interface CourseWithWeather extends Course {
  distanceKm?: number;
  temp?: number;
  windSpeed?: number;
  weatherCode?: number;
  playability?: string;
}

async function startRound(course: Course, router: ReturnType<typeof useRouter>, gcaKey?: string) {
  // Default holes — will be enriched below if API data is available
  const defaultHoles = Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1, par: 4, score: null as null, putts: 0, fairway: null as null, gir: false,
  }));

  const round: Round = {
    id: Date.now(),
    courseId: course.id,
    courseName: course.name || (course as Course).club_name || 'Unknown',
    courseLocation: course.location || (course as Course).city || '',
    courseLat: course.lat,
    courseLon: course.lon,
    holes: defaultHoles,
    currentHole: 1,
    totalScore: 0,
    totalPutts: 0,
    shots: [],
    startedAt: Date.now(),
    finished: false,
  };

  // Try to enrich holes with real par / yardage data from GolfCourseAPI
  if (course.id) {
    try {
      const keyParam = gcaKey ? `&key=${encodeURIComponent(gcaKey)}` : '';
      const res = await fetch(`/api/course?id=${encodeURIComponent(course.id)}${keyParam}`);
      if (res.ok) {
        const data = await res.json();
        // GCA returns course detail; holes may live at data.holes or data.course.holes
        const gcaHoles: Array<{ hole_number: number; par: number; handicap?: number; tees?: Array<{ tee_color?: string; distance?: number; distance_meters?: number }> }> =
          data.holes ?? data.course?.holes ?? [];
        if (gcaHoles.length >= 18) {
          round.holes = gcaHoles.slice(0, 18).map(h => {
            // Pick the middle tee by preference: white > yellow > any
            const teeOrder = ['white', 'yellow', 'blue', 'red'];
            let tee = h.tees?.find(t => teeOrder.includes((t.tee_color ?? '').toLowerCase()));
            if (!tee && h.tees?.length) tee = h.tees[0];
            return {
              hole: h.hole_number,
              par: h.par ?? 4,
              handicap: h.handicap,
              yardage: tee?.distance_meters ?? (tee?.distance ? Math.round(tee.distance * 0.9144) : undefined),
              score: null,
              putts: 0,
              fairway: null,
              gir: false,
            };
          });
        }
      }
    } catch {
      // silently fall back to defaults if API call fails
    }
  }

  saveActiveRound(round);
  router.push('/round');
}

export default function HomePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [courses, setCourses] = useState<CourseWithWeather[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  // Load settings + rounds on mount
  useEffect(() => {
    setSettings(getSettings());
    setRounds(getRounds().filter(r => r.finished).slice(0, 5));

    // Load Icelandic courses (no weather yet)
    setCourses(COURSES.slice(0, 60) as CourseWithWeather[]);

    // Try GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }

    // Load weather for first 8 courses
    COURSES.slice(0, 8).forEach(c => {
      if (!c.lat || !c.lon) return;
      fetch(`/api/weather?lat=${c.lat}&lon=${c.lon}`)
        .then(r => r.json())
        .then(d => {
          if (!d.current) return;
          const status = getPlayabilityStatus(d.current);
          setCourses(prev => prev.map(p =>
            p.id === c.id
              ? { ...p, temp: d.current.temperature, windSpeed: d.current.windSpeed, weatherCode: d.current.weatherCode, playability: status }
              : p
          ));
        })
        .catch(() => {});
    });
  }, []);

  // Sort Icelandic courses by distance
  const sortedCourses = userLoc
    ? [...courses].map(c => ({
        ...c,
        distanceKm: c.lat && c.lon ? getDistanceKm(userLoc.lat, userLoc.lon, c.lat, c.lon) : undefined,
      })).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
    : courses;

  const doSearch = useCallback(async () => {
    const q = search.trim();
    if (!q) return;
    setSearching(true); setSearchErr(''); setSearchResults([]);
    const gcaKey = settings?.gcaKey ?? '';
    try {
      const url = `/api/courses?q=${encodeURIComponent(q)}${gcaKey ? `&key=${encodeURIComponent(gcaKey)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setSearchErr(data.error ?? `Error ${res.status}`);
      } else {
        const list: Course[] = data.courses ?? data.results ?? [];
        setSearchResults(list);
        if (!list.length) setSearchErr('No courses found. Try a different name.');
      }
    } catch (e: unknown) {
      setSearchErr(e instanceof Error ? e.message : 'Search failed.');
    }
    setSearching(false);
  }, [search, settings]);

  const findNearby = useCallback(() => {
    setNearbyLoading(true); setSearchErr(''); setSearchResults([]);
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      setUserLoc({ lat, lon });
      const gcaKey = settings?.gcaKey ?? '';
      try {
        const url = `/api/nearby?lat=${lat}&lon=${lon}${gcaKey ? `&key=${encodeURIComponent(gcaKey)}` : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          setSearchErr(data.error ?? `Error ${res.status}`);
        } else {
          const raw: Course[] = data.courses ?? data.results ?? [];
          if (!raw.length) setSearchErr('No courses found nearby. Try searching by name.');
          else setSearchResults(raw);
        }
      } catch { setSearchErr('Location search failed.'); }
      setNearbyLoading(false);
    }, e => {
      setSearchErr(e.code === 1 ? 'Location access denied.' : 'Location unavailable.');
      setNearbyLoading(false);
    }, { timeout: 12000 });
  }, [settings]);

  const recentRounds = rounds.slice(0, 4);
  const avgScore = recentRounds.length
    ? Math.round(recentRounds.reduce((s, r) => s + (r.totalScore || 0), 0) / recentRounds.length)
    : null;

  const showCourses = searchResults.length > 0 ? searchResults : sortedCourses.slice(0, 10);
  const isSearchMode = searchResults.length > 0;

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      {/* Sticky header */}
      <div className="glass sticky top-0 z-30 px-4 safe-top pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-on-variant tracking-widest uppercase font-semibold">Good round,</p>
            <h1 className="font-display text-2xl font-bold text-on-surface leading-tight">
              {settings?.name ?? 'Karl'}
            </h1>
          </div>
          <button onClick={() => router.push('/settings')}
            className="w-11 h-11 rounded-full bg-surface-high flex items-center justify-center">
            <Icon name="settings" className="text-on-variant" />
          </button>
        </div>

        {/* Search row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-surface-highest rounded-2xl flex items-center px-3 gap-2 h-12">
            <Icon name="search" className="text-on-variant text-xl flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-on-surface placeholder:text-on-variant text-sm py-3 focus:outline-none font-body min-w-0"
              placeholder="Search worldwide courses…"
              value={search}
              onChange={e => { setSearch(e.target.value); if (!e.target.value) setSearchResults([]); }}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
            />
            {search && (
              <button onClick={() => { setSearch(''); setSearchResults([]); setSearchErr(''); }}
                className="text-on-variant p-1">
                <Icon name="close" className="text-lg" />
              </button>
            )}
          </div>
          <button onClick={doSearch} disabled={!search.trim() || searching}
            className="btn-primary rounded-2xl px-4 h-12 text-sm font-display font-semibold disabled:opacity-40 flex-shrink-0">
            {searching ? <Icon name="sports_golf" className="text-on-primary spin" /> : 'Search'}
          </button>
          <button onClick={findNearby}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${nearbyLoading ? 'bg-primary/20' : 'bg-surface-highest'}`}>
            <Icon name="near_me" className={`text-xl ${nearbyLoading ? 'text-primary pulse' : 'text-on-variant'}`} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 space-y-6">

        {/* Stats chips */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'HCP', value: settings?.handicap ?? 18, color: 'text-primary' },
            { label: 'Avg', value: avgScore ?? '—', color: 'text-on-surface' },
            { label: 'Rounds', value: recentRounds.length, color: 'text-on-surface' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-surface-low rounded-2xl p-4">
              <p className="text-xs text-on-variant tracking-wider uppercase mb-1">{label}</p>
              <p className={`font-display text-3xl font-bold leading-none ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {searchErr && (
          <div className="bg-error-container/30 rounded-2xl px-4 py-3 flex items-start gap-2">
            <Icon name="warning" className="text-error text-base flex-shrink-0 mt-0.5" />
            <p className="text-error text-sm">{searchErr}</p>
          </div>
        )}

        {/* Course list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-xs font-semibold text-on-variant tracking-widest uppercase">
              {isSearchMode ? 'Search Results' : userLoc ? 'Nearest Icelandic Courses' : 'Icelandic Courses'}
            </p>
            <p className="text-xs text-on-variant">{showCourses.length} courses</p>
          </div>
          <div className="space-y-2">
            {showCourses.map((c, i) => {
              const cw = c as CourseWithWeather;
              const icon = cw.weatherCode != null ? (WMO_ICON[cw.weatherCode] ?? 'cloud') : null;
              return (
                <div key={(c.id ?? '') + i} className="bg-surface-low rounded-2xl p-4 flex items-center gap-3 fade-up">
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-on-surface truncate text-sm">
                      {c.name || (c as Course).club_name || 'Unknown'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-on-variant truncate">
                        {c.location || c.city || ''}
                      </p>
                      {cw.distanceKm != null && (
                        <span className="text-xs text-primary font-semibold flex-shrink-0">
                          {cw.distanceKm < 1 ? `${Math.round(cw.distanceKm * 1000)} m` : `${cw.distanceKm.toFixed(1)} km`}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Weather snippet */}
                  {icon && cw.temp != null && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Icon name={icon} filled className="text-lg text-primary" />
                      <span className="font-display font-bold text-on-surface text-sm">{cw.temp}°</span>
                      {cw.windSpeed != null && (
                        <span className="text-xs text-on-variant">{cw.windSpeed}m/s</span>
                      )}
                    </div>
                  )}
                  <button onClick={() => startRound(c, router, settings?.gcaKey)}
                    className="btn-primary rounded-xl px-4 py-2.5 text-sm font-display font-semibold flex-shrink-0 min-h-[44px]">
                    Play
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent rounds */}
        {recentRounds.length > 0 && (
          <div>
            <p className="font-display text-xs font-semibold text-on-variant tracking-widest uppercase mb-3">Recent Rounds</p>
            <div className="space-y-2">
              {recentRounds.map((r, i) => (
                <div key={r.id} className={`rounded-2xl p-4 flex items-center justify-between ${i % 2 === 0 ? 'bg-surface-low' : 'bg-surface-mid'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-on-surface text-sm truncate">{r.courseName}</p>
                    <p className="text-xs text-on-variant mt-0.5">
                      {new Date(r.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-display text-2xl font-bold text-on-surface">{r.totalScore || '—'}</p>
                    <p className="text-xs text-on-variant">{r.totalPutts} putts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentRounds.length === 0 && !isSearchMode && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-surface-low flex items-center justify-center">
              <Icon name="sports_golf" className="text-3xl text-on-variant" />
            </div>
            <p className="text-sm text-on-variant">Tap <strong className="text-primary">Play</strong> on any course to start your first round</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
