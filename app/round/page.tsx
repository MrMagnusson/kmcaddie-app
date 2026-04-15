'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { WeatherWidget } from '@/components/WeatherWidget';
import { CaddieModal } from '@/components/CaddieModal';
import { Icon } from '@/components/Icon';
import { Round, HoleData, AppSettings } from '@/lib/types';
import { getSettings, getActiveRound, saveActiveRound, clearActiveRound, addOrUpdateRound } from '@/lib/storage';

function havKm(a: number, b: number, c: number, d: number) {
  const R = 6371, dr = Math.PI / 180;
  const x = Math.sin((c - a) * dr / 2) ** 2 + Math.cos(a * dr) * Math.cos(c * dr) * Math.sin((d - b) * dr / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const scoreLabel = (vp: number | null) => {
  if (vp == null) return '—';
  if (vp <= -2) return 'Eagle'; if (vp === -1) return 'Birdie';
  if (vp === 0) return 'Par'; if (vp === 1) return 'Bogey';
  if (vp === 2) return 'Double'; return `+${vp}`;
};
const scoreColor = (vp: number | null) =>
  vp == null ? 'text-on-variant' : vp < 0 ? 'text-primary' : vp === 0 ? 'text-on-surface' : 'text-error';

export default function RoundPage() {
  const router = useRouter();
  const [round, setRound] = useState<Round | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [gpsPos, setGpsPos] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [shotStart, setShotStart] = useState<{ lat: number; lon: number } | null>(null);
  const [caddieOpen, setCaddieOpen] = useState(false);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    setSettings(getSettings());
    const r = getActiveRound();
    if (r) setRound(r);
  }, []);

  // Persist round on every change
  useEffect(() => {
    if (round) saveActiveRound(round);
  }, [round]);

  // GPS watch
  useEffect(() => {
    if (tracking) {
      watchRef.current = navigator.geolocation.watchPosition(
        p => setGpsPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    } else {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [tracking]);

  const updateHole = useCallback((field: keyof HoleData, val: unknown) => {
    setRound(r => {
      if (!r) return r;
      const holes = [...r.holes];
      holes[r.currentHole - 1] = { ...holes[r.currentHole - 1], [field]: val };
      return {
        ...r, holes,
        totalScore: holes.reduce((s, h) => s + (h.score ?? 0), 0),
        totalPutts: holes.reduce((s, h) => s + (h.putts ?? 0), 0),
      };
    });
  }, []);

  const adjustScore = (delta: number) => {
    const cur = round!.holes[round!.currentHole - 1];
    updateHole('score', Math.max(1, (cur.score ?? cur.par) + delta));
  };
  const adjustPutts = (delta: number) => {
    const cur = round!.holes[round!.currentHole - 1];
    updateHole('putts', Math.max(0, (cur.putts ?? 0) + delta));
  };

  const trackShot = () => {
    if (!tracking) { setTracking(true); return; }
    if (!gpsPos) return;
    if (!shotStart) {
      setShotStart({ lat: gpsPos.lat, lon: gpsPos.lon });
    } else {
      const dist = Math.round(havKm(shotStart.lat, shotStart.lon, gpsPos.lat, gpsPos.lon) * 1000);
      setRound(r => r ? { ...r, shots: [...r.shots, { hole: r.currentHole, dist, ts: Date.now() }] } : r);
      setShotStart({ lat: gpsPos.lat, lon: gpsPos.lon });
    }
  };

  const goHole = (n: number) => {
    if (n >= 1 && n <= 18) setRound(r => r ? { ...r, currentHole: n } : r);
  };

  const finishRound = () => {
    if (!round) return;
    if (!confirm('Finish round and save score?')) return;
    const finished: Round = { ...round, finished: true, finishedAt: Date.now() };
    addOrUpdateRound(finished);
    clearActiveRound();
    router.push('/stats');
  };

  if (!round) return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-surface-low flex items-center justify-center">
          <Icon name="sports_golf" className="text-5xl text-on-variant" />
        </div>
        <p className="font-display text-xl font-semibold text-on-surface">No active round</p>
        <p className="text-sm text-on-variant">Go to Home and tap <strong className="text-primary">Play</strong> on a course to start</p>
        <button onClick={() => router.push('/')} className="btn-primary rounded-2xl px-6 py-3 font-display font-semibold mt-2">
          Go to Home
        </button>
      </div>
      <BottomNav />
    </div>
  );

  const hole = round.holes[round.currentHole - 1];
  const vsPar = hole.score != null ? hole.score - hole.par : null;
  const toPar = round.holes.reduce((s, h) => h.score != null ? s + (h.score - h.par) : s, 0);
  const holesPlayed = round.holes.filter(h => h.score != null).length;
  const shotDist = gpsPos && shotStart ? Math.round(havKm(shotStart.lat, shotStart.lon, gpsPos.lat, gpsPos.lon) * 1000) : null;

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Sticky header */}
      <div className="glass px-4 safe-top pb-3 flex-shrink-0 z-20 relative">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-on-variant font-semibold truncate">{round.courseName}</p>
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-on-surface">
                {holesPlayed === 0 ? '—' : toPar === 0 ? 'E' : toPar > 0 ? `+${toPar}` : String(toPar)}
              </span>
              <span className="text-xs text-on-variant">{holesPlayed} holes · {round.totalPutts} putts</span>
            </div>
          </div>
          <button onClick={finishRound}
            className="ml-3 px-4 py-2 rounded-xl bg-surface-high text-on-surface text-xs font-semibold min-h-[40px]">
            Finish
          </button>
        </div>
        {/* Hole pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {round.holes.map((h, i) => {
            const hp = h.score != null ? h.score - h.par : null;
            return (
              <button key={i} onClick={() => goHole(i + 1)}
                className={`flex-shrink-0 w-8 h-8 rounded-full text-xs font-display font-bold transition-all ${
                  round.currentHole === i + 1 ? 'btn-primary' :
                  hp == null ? 'bg-surface-high text-on-variant' :
                  hp < 0 ? 'bg-primary/25 text-primary' :
                  hp === 0 ? 'bg-surface-highest text-on-surface' : 'bg-error/20 text-error'
                }`}>
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3 space-y-3">

        {/* Weather widget */}
        {round.courseLat && round.courseLon && (
          <WeatherWidget lat={round.courseLat} lon={round.courseLon} />
        )}

        {/* Distance HUD */}
        <div className="rounded-2xl relative overflow-hidden p-5"
          style={{ background: 'linear-gradient(135deg,#0a1a0a 0%,#122012 40%,#1a3a1a 70%,#0d200d 100%)', minHeight: 156 }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07]">
            <div className="w-28 h-28 rounded-full border border-white flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-white flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-xs text-on-variant/60 tracking-widest uppercase">Hole</p>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-bold text-on-surface leading-none">{round.currentHole}</span>
                <span className="font-display text-lg text-on-variant font-light">/ 18</span>
              </div>
              {shotDist != null && (
                <div className="mt-2">
                  <p className="font-display text-2xl font-bold text-primary">{shotDist} m</p>
                  <p className="text-xs text-on-variant">shot distance</p>
                </div>
              )}
              {tracking && gpsPos && !shotStart && (
                <p className="text-xs text-primary mt-2">GPS ±{gpsPos.acc}m · tap Track Shot</p>
              )}
              {tracking && !gpsPos && (
                <p className="text-xs text-on-variant mt-2 pulse">Acquiring GPS…</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-on-variant tracking-widest uppercase mb-1.5">Par</p>
              <div className="flex gap-1">
                {[3, 4, 5].map(p => (
                  <button key={p} onClick={() => updateHole('par', p)}
                    className={`w-9 h-9 rounded-full text-sm font-display font-bold transition-all ${hole.par === p ? 'btn-primary' : 'bg-surface-highest/50 text-on-variant'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => { setTracking(t => { if (t) setShotStart(null); return !t; }); }}
            className={`absolute bottom-4 left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${tracking ? 'bg-primary/20 text-primary' : 'bg-black/30 text-on-variant'}`}>
            <Icon name={tracking ? 'gps_fixed' : 'gps_not_fixed'} className="text-base" />
            {tracking ? 'GPS On' : 'GPS Off'}
          </button>
        </div>

        {/* Score + Putts */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Score', val: hole.score, sub: scoreLabel(vsPar), subColor: scoreColor(vsPar), onDec: () => adjustScore(-1), onInc: () => adjustScore(1) },
            { label: 'Putts', val: hole.putts ?? 0, sub: null, subColor: '', onDec: () => adjustPutts(-1), onInc: () => adjustPutts(1) },
          ].map(({ label, val, sub, subColor, onDec, onInc }) => (
            <div key={label} className="bg-surface-low rounded-2xl p-4">
              <p className="text-xs text-on-variant tracking-wider uppercase mb-3">{label}</p>
              <div className="flex items-center justify-between gap-1">
                <button onClick={onDec} className="w-11 h-11 rounded-full bg-surface-high flex items-center justify-center">
                  <Icon name="remove" className="text-on-surface text-xl" />
                </button>
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-on-surface leading-none">{val ?? '—'}</p>
                  {sub && <p className={`text-xs font-semibold mt-0.5 ${subColor}`}>{sub}</p>}
                </div>
                <button onClick={onInc} className="w-11 h-11 rounded-full bg-surface-high flex items-center justify-center">
                  <Icon name="add" className="text-on-surface text-xl" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Fairway + GIR */}
        <div className="bg-surface-low rounded-2xl p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-on-variant tracking-wider uppercase mb-2">Fairway</p>
              <div className="flex gap-2">
                {(['hit', 'left', 'right'] as const).map(v => (
                  <button key={v} onClick={() => updateHole('fairway', hole.fairway === v ? null : v)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize min-h-[36px] transition-all ${hole.fairway === v ? 'bg-primary text-on-primary' : 'bg-surface-high text-on-variant'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-on-variant tracking-wider uppercase mb-2">GIR</p>
              <button onClick={() => updateHole('gir', !hole.gir)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] transition-all ${hole.gir ? 'bg-primary text-on-primary' : 'bg-surface-high text-on-variant'}`}>
                {hole.gir ? 'Yes ✓' : 'No'}
              </button>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={trackShot}
            className={`rounded-2xl p-4 flex flex-col items-start gap-2 min-h-[88px] transition-all ${shotStart ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-surface-low'}`}>
            <Icon name="my_location" className={`text-2xl ${shotStart ? 'text-primary' : 'text-on-variant'}`} />
            <div>
              <p className="text-sm font-display font-semibold text-on-surface">{shotStart ? 'Mark Landing' : 'Track Shot'}</p>
              <p className={`text-xs mt-0.5 ${shotStart ? 'text-primary' : 'text-on-variant'}`}>
                {shotStart ? 'Tap when ball lands' : tracking ? 'Tap to set origin' : 'Enables GPS'}
              </p>
            </div>
          </button>
          <button onClick={() => setCaddieOpen(true)}
            className="btn-primary rounded-2xl p-4 flex flex-col items-start gap-2 min-h-[88px]">
            <Icon name="psychology" className="text-2xl text-on-primary" />
            <div>
              <p className="text-sm font-display font-semibold text-on-primary">AI Caddie</p>
              <p className="text-xs text-on-primary/70 mt-0.5">Ask for advice</p>
            </div>
          </button>
        </div>

        {/* Shot distances for this hole */}
        {round.shots.filter(s => s.hole === round.currentHole).length > 0 && (
          <div className="bg-surface-low rounded-2xl p-4">
            <p className="text-xs text-on-variant tracking-wider uppercase mb-3">Shot Distances — Hole {round.currentHole}</p>
            {round.shots.filter(s => s.hole === round.currentHole).map((s, i) => (
              <div key={i} className={`flex justify-between items-center py-2 ${i > 0 ? 'border-t border-outline-v/10' : ''}`}>
                <span className="text-sm text-on-variant">Shot {i + 1}</span>
                <span className="font-display font-bold text-primary">{s.dist} m</span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button onClick={() => goHole(round.currentHole - 1)} disabled={round.currentHole === 1}
            className="flex-1 h-14 rounded-2xl bg-surface-high flex items-center justify-center gap-2 disabled:opacity-30">
            <Icon name="arrow_back" className="text-on-surface" />
            <span className="font-display font-semibold text-on-surface">Prev</span>
          </button>
          <button onClick={() => round.currentHole === 18 ? finishRound() : goHole(round.currentHole + 1)}
            className="flex-1 h-14 rounded-2xl btn-primary flex items-center justify-center gap-2">
            <span className="font-display font-semibold text-on-primary">{round.currentHole === 18 ? 'Finish' : 'Next'}</span>
            <Icon name={round.currentHole === 18 ? 'flag' : 'arrow_forward'} className="text-on-primary" />
          </button>
        </div>
      </div>

      <BottomNav />

      {caddieOpen && settings && (
        <CaddieModal round={round} settings={settings} onClose={() => setCaddieOpen(false)} />
      )}
    </div>
  );
}
