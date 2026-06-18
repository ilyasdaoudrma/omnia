import { useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeading } from './SectionHeading';
import { Reveal } from '@/components/fx/Reveal';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { StepRow } from '@/components/agent/StepRow';
import { RecommendationCard } from '@/components/agent/RecommendationCard';
import { aiProvider } from '@/lib/ai';
import type { AgentStep, Recommendation } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

const EXAMPLES = [
  { label: '🏠  Stays in Rabat', prompt: 'Find me a great stay in Rabat for 2 people under 500 MAD a night.' },
  { label: '🍔  Best burgers nearby', prompt: 'Show me the best burger spots near me.' },
  { label: '🛏️  A riad for the weekend', prompt: 'Find a beautiful riad in Rabat.' },
  { label: '🍽️  Dinner options', prompt: 'Where can I get a good tagine for dinner nearby?' },
];

export function DemoShowcase() {
  const [active, setActive] = useState<number | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [answer, setAnswer] = useState('');
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const run = useCallback(async (index: number) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setActive(index);
    setSteps([]);
    setAnswer('');
    setRecs([]);
    setRunning(true);

    try {
      // Landing-page demo runs with a constant Rabat location so it returns
      // real OMNIA Stays/Eats results without asking the visitor to log in.
      const stream = aiProvider.run({
        prompt: EXAMPLES[index].prompt,
        history: [],
        signal: controller.signal,
        location: { lat: 34.0209, lon: -6.8416, city: 'Rabat', country: 'Morocco' },
      });
      for await (const e of stream) {
        if (controller.signal.aborted) break;
        if (e.type === 'step') setSteps((p) => [...p, e.step]);
        else if (e.type === 'step_update')
          setSteps((p) => p.map((s) => (s.id === e.id ? { ...s, status: e.status, detail: e.detail ?? s.detail } : s)));
        else if (e.type === 'token') setAnswer((a) => a + e.text);
        else if (e.type === 'recommendations') setRecs(e.items);
      }
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  }, []);

  return (
    <section id="demo" className="relative px-6 py-section">
      <SectionHeading
        eyebrow="Live demo"
        title={<>Watch the agent <span className="text-gradient-cool">think</span></>}
        subtitle="Pick a request and see the planner decompose it, tools execute, and recommendations appear — live."
      />

      <Reveal className="mx-auto mt-14 max-w-6xl">
        <GlassCard strong className="overflow-hidden p-4 md:p-6">
          {/* window chrome */}
          <div className="mb-5 flex items-center gap-2 px-1">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
            <span className="ml-3 flex items-center gap-1.5 text-xs text-white/40">
              <Sparkles className="h-3.5 w-3.5" /> agent.run()
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            {/* Left: prompts + thinking */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={ex.label}
                    onClick={() => run(i)}
                    disabled={running}
                    className={cn(
                      'rounded-full border px-3.5 py-2 text-sm transition-all duration-300',
                      active === i
                        ? 'border-accent/50 bg-accent/15 text-white'
                        : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white',
                      running && 'cursor-not-allowed opacity-60',
                    )}
                    data-cursor="hover"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              <div className="min-h-[16rem] rounded-2xl border border-white/8 bg-ink-950/40 p-3">
                {steps.length === 0 ? (
                  <div className="flex h-full min-h-[14rem] flex-col items-center justify-center gap-2 text-center text-white/35">
                    <Sparkles className="h-6 w-6 text-accent/60" />
                    <p className="text-sm">Select a request to start the agent.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {steps.map((s) => (
                        <StepRow key={s.id} step={s} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Right: answer + recommendations */}
            <div className="flex flex-col gap-4">
              <div className="min-h-[5rem] rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                {answer ? (
                  <p className="text-[15px] leading-relaxed text-white/80">
                    {answer}
                    {running && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />}
                  </p>
                ) : (
                  <p className="text-sm text-white/30">The agent's recommendation will stream here…</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {recs.slice(0, 4).map((r) => (
                  <RecommendationCard key={r.id} rec={r} compact />
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    controllerRef.current?.abort();
                    setActive(null);
                    setSteps([]);
                    setAnswer('');
                    setRecs([]);
                    setRunning(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white"
                  data-cursor="hover"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </button>
                <Link to="/chat">
                  <Button size="sm" variant="glass" className="gap-1.5">
                    Open full agent <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>
      </Reveal>
    </section>
  );
}
