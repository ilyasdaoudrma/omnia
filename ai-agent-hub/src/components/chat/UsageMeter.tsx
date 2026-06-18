import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { fetchUsage, type UsageSnapshot } from '@/lib/api';
import { useAgentStore } from '@/store/agentStore';

/** Shows how many agent requests are left this minute and today (like an API usage
 *  meter), just above the composer. Keyed per signed-in user, else per IP. */
export function UsageMeter() {
  const isRunning = useAgentStore((s) => s.isRunning);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);

  // Initial load + a gentle poll so the reset countdown stays roughly fresh.
  useEffect(() => {
    let alive = true;
    const load = () => fetchUsage().then((u) => alive && setUsage(u));
    load();
    const id = setInterval(load, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Refresh the moment a run finishes so the remaining count drops immediately.
  useEffect(() => {
    if (!isRunning) fetchUsage().then((u) => u && setUsage(u));
  }, [isRunning]);

  if (!usage) return null;
  const { minute, day } = usage;
  const minuteLow = minute.remaining <= 3;
  const dayLow = day.remaining <= 10;

  return (
    <div
      className="mb-1.5 flex items-center justify-end gap-2 px-1 text-[11px] text-white/40"
      title={`Agent requests left — ${minute.remaining}/${minute.limit} this minute, ${day.remaining}/${day.limit} today. Resets keep your usage fair and Groq costs in check.`}
    >
      <Zap className="h-3 w-3 text-accent/70" />
      <span className={minuteLow ? 'font-medium text-amber-300/90' : ''}>
        <span className="tabular-nums">{minute.remaining}</span>/{minute.limit} this minute
      </span>
      <span className="text-white/20">·</span>
      <span className={dayLow ? 'font-medium text-amber-300/90' : ''}>
        <span className="tabular-nums">{day.remaining}</span>/{day.limit} today
      </span>
      {minute.remaining === 0 && minute.resetSeconds > 0 && (
        <span className="text-white/30">· resets in {minute.resetSeconds}s</span>
      )}
    </div>
  );
}
