'use client';
import { Round, AppSettings } from './types';

const KEY_SETTINGS = 'km_settings';
const KEY_ROUNDS   = 'km_rounds';
const KEY_ACTIVE   = 'km_active_round';

export const DEFAULT_SETTINGS: AppSettings = {
  name: 'Karl',
  handicap: 18,
  antKey: '',
  gcaKey: '',
};

// ── Generic helpers ──────────────────────────────────────────────────────────
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v != null ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

// ── Settings ─────────────────────────────────────────────────────────────────
export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<AppSettings>>(KEY_SETTINGS, {}) };
}
export function saveSettings(s: AppSettings): void { write(KEY_SETTINGS, s); }

// ── Rounds ───────────────────────────────────────────────────────────────────
export function getRounds(): Round[] { return read<Round[]>(KEY_ROUNDS, []); }
export function saveRounds(rounds: Round[]): void { write(KEY_ROUNDS, rounds.slice(0, 50)); }

export function addOrUpdateRound(round: Round): void {
  const rounds = getRounds();
  const idx = rounds.findIndex(r => r.id === round.id);
  if (idx >= 0) rounds[idx] = round;
  else rounds.unshift(round);
  saveRounds(rounds);
}

// ── Active round ─────────────────────────────────────────────────────────────
export function getActiveRound(): Round | null { return read<Round | null>(KEY_ACTIVE, null); }
export function saveActiveRound(round: Round | null): void { write(KEY_ACTIVE, round); }

export function clearActiveRound(): void {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY_ACTIVE);
}
