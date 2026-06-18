import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Wallet, CalendarDays, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToolIcon } from '@/components/ui/ToolIcon';
import { Reveal } from '@/components/fx/Reveal';
import { stagger, fadeUp } from '@/lib/motion';
import { formatMAD } from '@/lib/utils';
import { ITINERARY } from '@/data/itinerary';

export function ItineraryPage() {
  const total = ITINERARY.flatMap((d) => d.items).reduce((sum, i) => sum + (i.cost ?? 0), 0);

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Badge tone="accent" className="mb-3">
                <Sparkles className="h-3.5 w-3.5" /> Agent-generated plan
              </Badge>
              <h1 className="font-display text-4xl font-bold tracking-tight">Weekend in Rabat</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/50">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent-soft" /> Rabat, Morocco</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-accent-soft" /> 3 days · Jun 12–15</span>
                <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-accent-soft" /> {formatMAD(total)} of 3000</span>
              </div>
            </div>
            <Link to="/chat">
              <Button magnetic className="gap-2">
                <Sparkles className="h-4 w-4" /> Adjust with agent
              </Button>
            </Link>
          </div>
        </Reveal>

        {/* Budget bar */}
        <Reveal delay={0.05} className="mt-8">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Budget used</span>
              <span className="font-medium">{formatMAD(total)} / {formatMAD(3000)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#f3ecd6,#9a7b1e,#f1d98a)]"
                initial={{ width: 0 }}
                animate={{ width: `${(total / 3000) * 100}%` }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </GlassCard>
        </Reveal>

        {/* Timeline */}
        <div className="mt-10 space-y-12">
          {ITINERARY.map((day) => (
            <section key={day.day}>
              <Reveal>
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] font-display text-lg font-bold text-white">
                    {day.day}
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/35">Day {day.day}</p>
                    <h2 className="text-xl font-semibold tracking-tight">{day.label}</h2>
                  </div>
                </div>
              </Reveal>

              <motion.ol
                variants={stagger(0.08)}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                className="relative ml-5 space-y-3 border-l border-white/10 pl-8"
              >
                {day.items.map((item) => (
                  <motion.li key={item.id} variants={fadeUp} className="relative">
                    {/* node */}
                    <span className="absolute -left-[2.55rem] top-4 grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-ink-900">
                      <ToolIcon tool={item.tool} />
                    </span>
                    <GlassCard className="flex items-center gap-4 p-4 transition-transform duration-300 ease-expo hover:translate-x-1" data-cursor="hover">
                      <span className="font-mono text-sm text-accent-soft">{item.time}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="truncate text-sm text-white/50">{item.detail}</p>
                      </div>
                      {item.cost != null && (
                        <span className="shrink-0 text-sm font-semibold text-gradient">{formatMAD(item.cost)}</span>
                      )}
                    </GlassCard>
                  </motion.li>
                ))}
              </motion.ol>
            </section>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
