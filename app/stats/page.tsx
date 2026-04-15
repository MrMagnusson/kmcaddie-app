'use client';

import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Icon } from '@/components/Icon';
import { Round } from '@/lib/types';
import { getRounds } from '@/lib/storage';

export default function StatsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => { setRounds(getRounds().filter(r => r.finished)); }, []);

  if (!rounds.length) return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="w-24 h-24 rounded-full bg-surface-low flex items-center justify-center">
          <Icon name="bar_chart" className="text-5xl text-on-variant" />
        </div>
        <p className="font-display text-xl font-semibold text-on-surface">No rounds yet</p>
        <p className="text-sm text-on-variant mt-1">Complete a round to see your stats</p>
      </div>
      <BottomNav />
    </div>
  );

  const allHoles = rounds.flatMap(r => r.holes);
  const scored = allHoles.filter(h => h.score != null);
  const avgScore = Math.round(rounds.reduce((s, r) => s + (r.totalScore || 0), 0) / rounds.length);
  const avgPutts = Math.round(rounds.reduce((s, r) => s + (r.totalPutts || 0), 0) / rounds.length);
  const fwHoles = allHoles.filter(h => h.fairway != null);
  const fwPct = fwHoles.length ? Math.round(fwHoles.filter(h => h.fairway === 'hit').length / fwHoles.length * 100) : 0;
  const girPct = scored.length ? Math.round(allHoles.filter(h => h.gir).length / scored.length * 100) : 0;
  const puttsHole = scored.length ? (allHoles.reduce((s, h) => s + (h.putts || 0), 0) / scored.length).toFixed(1) : '—';

  const dist = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, worse: 0 };
  scored.forEach(h => {
    const d = h.score! - h.par;
    if (d <= -2) dist.eagle++;
    else if (d === -1) dist.birdie++;
    else if (d === 0) dist.par++;
    else if (d === 1) dist.bogey++;
    else if (d === 2) dist.double++;
    else dist.worse++;
  });
  const total = scored.length || 1;

  const distRows = [
    { label: 'Eagle',  key: 'eagle',  bar: 'bg-primary'       },
    { label: 'Birdie', key: 'birdie', bar: 'bg-primary/70'     },
    { label: 'Par',    key: 'par',    bar: 'bg-on-variant/60'  },
    { label: 'Bogey',  key: 'bogey',  bar: 'bg-error/60'       },
    { label: 'Double', key: 'double', bar: 'bg-error'          },
    { label: 'Worse',  key: 'worse',  bar: 'bg-error-container'},
  ] as const;

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      <div className="glass sticky top-0 z-30 px-4 safe-top pb-4 flex-shrink-0">
        <h1 className="font-display text-2xl font-bold text-on-surface">Statistics</h1>
        <p className="text-xs text-on-variant mt-0.5">{rounds.length} round{rounds.length !== 1 ? 's' : ''} tracked</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 space-y-5">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Avg Score',  val: avgScore, unit: '',  color: 'text-on-surface' },
            { label: 'Avg Putts',  val: avgPutts, unit: '',  color: 'text-on-surface' },
            { label: 'Fairways',   val: fwPct,    unit: '%', color: 'text-primary'    },
            { label: 'GIR',        val: girPct,   unit: '%', color: 'text-primary'    },
          ].map(({ label, val, unit, color }) => (
            <div key={label} className="bg-surface-low rounded-2xl p-4">
              <p className="text-xs text-on-variant tracking-wider uppercase mb-1">{label}</p>
              <p className={`font-display text-4xl font-bold leading-none ${color}`}>{val}{unit}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface-low rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-on-variant tracking-wider uppercase">Putts per hole</p>
            <p className="font-display text-3xl font-bold text-on-surface mt-1">{puttsHole}</p>
          </div>
          <Icon name="sports_golf" className="text-4xl text-on-variant" />
        </div>

        {/* Score distribution */}
        <div className="bg-surface-low rounded-2xl p-5">
          <p className="font-display text-xs font-semibold text-on-variant tracking-widest uppercase mb-4">Score Distribution</p>
          {distRows.map(({ label, key, bar }) => {
            const count = dist[key];
            const pct = Math.round(count / total * 100);
            return (
              <div key={key} className="flex items-center gap-3 mb-2.5">
                <span className="w-14 text-xs font-display font-semibold text-on-variant">{label}</span>
                <div className="flex-1 h-2 bg-surface-high rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right text-xs text-on-variant">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Round history */}
        <div>
          <p className="font-display text-xs font-semibold text-on-variant tracking-widest uppercase mb-3">Round History</p>
          <div className="space-y-3">
            {rounds.map(r => (
              <div key={r.id} className="bg-surface-low rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-on-surface text-sm truncate">{r.courseName}</p>
                    <p className="text-xs text-on-variant mt-0.5">
                      {new Date(r.startedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className="font-display text-2xl font-bold text-on-surface">{r.totalScore || '—'}</p>
                    <p className="text-xs text-on-variant">{r.totalPutts} putts</p>
                  </div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                  {r.holes.map((h, hi) => {
                    const d = h.score != null ? h.score - h.par : null;
                    return (
                      <div key={hi} className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-display ${
                        h.score == null ? 'bg-surface-high text-on-variant' :
                        d! <= -2 ? 'bg-primary text-on-primary' :
                        d === -1 ? 'bg-primary/60 text-on-primary' :
                        d === 0  ? 'bg-surface-highest text-on-surface' :
                        d === 1  ? 'bg-error/30 text-error' : 'bg-error/60 text-error'
                      }`}>{h.score ?? '·'}</div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
