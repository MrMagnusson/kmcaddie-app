'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { AppSettings } from '@/lib/types';
import { getSettings, saveSettings } from '@/lib/storage';

export default function SettingsPage() {
  const router = useRouter();
  const [s, setS] = useState<AppSettings>({ name: 'Karl', handicap: 18, antKey: '', gcaKey: '' });
  const update = (k: keyof AppSettings, v: string | number) => setS(p => ({ ...p, [k]: v }));

  useEffect(() => { setS(getSettings()); }, []);

  const save = () => { saveSettings(s); router.push('/'); };

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      <div className="glass px-4 safe-top pb-4 flex items-center justify-between flex-shrink-0">
        <button onClick={() => router.back()} className="w-11 h-11 rounded-full bg-surface-high flex items-center justify-center">
          <Icon name="arrow_back" className="text-on-surface" />
        </button>
        <h1 className="font-display text-lg font-bold text-on-surface">Settings</h1>
        <div className="w-11" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 pb-12">
        <Field label="Your Name" hint="">
          <input
            className="w-full bg-surface-highest rounded-2xl px-4 py-3.5 text-on-surface text-sm font-body border-b-2 border-transparent focus:border-primary focus:outline-none transition-colors"
            value={s.name}
            onChange={e => update('name', e.target.value)}
            placeholder="Karl"
          />
        </Field>

        <Field label="Handicap Index" hint="">
          <input
            type="number"
            className="w-full bg-surface-highest rounded-2xl px-4 py-3.5 text-on-surface text-sm font-body border-b-2 border-transparent focus:border-primary focus:outline-none transition-colors"
            value={s.handicap}
            onChange={e => update('handicap', parseFloat(e.target.value) || 0)}
            min="0" max="54" step="0.1"
          />
        </Field>

        <Field label="GolfCourse API Key" hint="For worldwide course search. Free at golfcourseapi.com · Or set GOLF_COURSE_API_KEY in Vercel env vars.">
          <input
            type="password"
            className="w-full bg-surface-highest rounded-2xl px-4 py-3.5 text-on-surface text-sm font-mono border-b-2 border-transparent focus:border-primary focus:outline-none transition-colors"
            value={s.gcaKey}
            onChange={e => update('gcaKey', e.target.value)}
            placeholder="Paste key here…"
          />
        </Field>

        <Field label="Anthropic API Key" hint="Required for AI Caddie. Get yours at console.anthropic.com">
          <input
            type="password"
            className="w-full bg-surface-highest rounded-2xl px-4 py-3.5 text-on-surface text-sm font-mono border-b-2 border-transparent focus:border-primary focus:outline-none transition-colors"
            value={s.antKey}
            onChange={e => update('antKey', e.target.value)}
            placeholder="sk-ant-api03-…"
          />
        </Field>

        <button onClick={save}
          className="w-full btn-primary rounded-2xl py-4 font-display font-bold text-base mt-4">
          Save Settings
        </button>

        <div className="bg-surface-low rounded-2xl p-4 text-xs text-on-variant leading-relaxed">
          <p className="font-semibold text-on-surface mb-1">Weather data</p>
          <p>Powered by <span className="text-primary">met.no</span> (Norwegian Meteorological Institute) — free, no API key needed. Optimised for Iceland &amp; North Atlantic.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-on-variant tracking-wider uppercase font-semibold mb-2 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-on-variant mt-2 leading-relaxed">{hint}</p>}
    </div>
  );
}
