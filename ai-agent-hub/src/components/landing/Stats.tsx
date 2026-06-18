import { Reveal } from '@/components/fx/Reveal';
import { useCountUp } from '@/hooks/useCountUp';

const STATS = [
  { value: 6, suffix: '+', label: 'Connected tool categories' },
  { value: 12, suffix: 's', label: 'Avg. plan-to-recommendation' },
  { value: 98, suffix: '%', label: 'Requests fully decomposed' },
  { value: 40, suffix: 'k', label: 'Actions taken on approval' },
];

function Stat({ value, suffix, label }: (typeof STATS)[number]) {
  const { ref, display } = useCountUp(value);
  return (
    <div className="text-center">
      <div className="font-display text-5xl font-bold tracking-tight md:text-6xl">
        <span ref={ref} className="text-gradient">
          {Math.round(display)}
        </span>
        <span className="text-gradient">{suffix}</span>
      </div>
      <p className="mt-2 text-sm text-white/45">{label}</p>
    </div>
  );
}

export function Stats() {
  return (
    <section className="relative px-6 py-section">
      <Reveal className="mx-auto max-w-5xl">
        <div className="glass grid grid-cols-2 gap-y-10 rounded-4xl px-8 py-12 md:grid-cols-4">
          {STATS.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}
