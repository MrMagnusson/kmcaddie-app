'use client';

import { useEffect, useRef, useState } from 'react';
import { Round, AppSettings } from '@/lib/types';
import { Icon } from './Icon';

interface Msg { role: 'user' | 'assistant'; content: string; }

interface Props {
  round: Round;
  settings: AppSettings;
  onClose: () => void;
}

export function CaddieModal({ round, settings, onClose }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const hole = round.holes[round.currentHole - 1];

  useEffect(() => {
    if (!settings.antKey) {
      setErr('Add your Anthropic API key in Settings to use the AI Caddie.');
      return;
    }
    const ctx = `I am on hole ${round.currentHole} of 18 (par ${hole?.par ?? 4}) at ${round.courseName}. My handicap is ${settings.handicap}. Score so far: ${round.totalScore} across ${round.holes.filter(h => h.score !== null).length} holes.`;
    sendMsg(`${ctx} Give me a focused caddie tip to start the hole.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const sendMsg = async (text: string) => {
    if (!text.trim() || !settings.antKey) return;
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(newMsgs);
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': settings.antKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 350,
          system: `You are KM Caddie, a sharp personal golf caddie for ${settings.name || 'Karl'} (handicap ${settings.handicap}). Be concise, practical and confident. Cover club selection, course management, and mindset. Keep responses under 120 words. Speak like a real caddie — no bullet lists.`,
          messages: newMsgs,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setMsgs([...newMsgs, { role: 'assistant', content: data.content?.[0]?.text ?? 'No response.' }]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Request failed. Check your API key in Settings.');
    }
    setLoading(false);
  };

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setInput('');
    sendMsg(q);
  };

  const QUICK = ['Which club should I hit?', 'How should I play this hole?', 'I need a mental reset'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Header */}
      <div className="glass px-4 safe-top pb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full btn-primary flex items-center justify-center flex-shrink-0">
            <Icon name="psychology" className="text-on-primary text-xl" />
          </div>
          <div>
            <p className="font-display font-bold text-on-surface">AI Caddie</p>
            <p className="text-xs text-primary">Powered by Claude</p>
          </div>
        </div>
        <button onClick={onClose} className="w-11 h-11 rounded-full bg-surface-high flex items-center justify-center">
          <Icon name="close" className="text-on-surface" />
        </button>
      </div>

      {/* Context pill */}
      <div className="px-4 py-2 flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 bg-surface-high rounded-full px-3 py-1.5 text-xs font-semibold text-on-variant">
          <Icon name="sports_golf" className="text-sm text-primary" />
          Hole {round.currentHole} · Par {hole?.par ?? 4} · {round.courseName}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {err && <div className="bg-error-container/30 rounded-2xl p-4 text-sm text-error">{err}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'btn-primary text-on-primary' : 'bg-surface-high text-on-surface'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-high rounded-2xl px-5 py-3.5 flex gap-1.5 items-center">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 rounded-full bg-primary pulse" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {msgs.filter(m => m.role === 'user').length <= 1 && !loading && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0">
          {QUICK.map(q => (
            <button key={q} onClick={() => sendMsg(q)}
              className="flex-shrink-0 bg-surface-high rounded-2xl px-3 py-2 text-xs font-semibold text-on-variant whitespace-nowrap min-h-[36px]">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="glass px-4 py-3 safe-bottom flex-shrink-0 border-t border-outline-v/20">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-surface-highest rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-variant focus:outline-none"
            placeholder="Ask your caddie…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button onClick={send} disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl btn-primary flex items-center justify-center disabled:opacity-40 flex-shrink-0">
            <Icon name="send" className="text-on-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}
