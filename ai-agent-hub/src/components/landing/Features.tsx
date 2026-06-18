import { motion } from 'framer-motion';
import { Brain, Workflow, Boxes, ShieldCheck, Gauge, MessageSquareText } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeading } from './SectionHeading';
import { Reveal } from '@/components/fx/Reveal';
import { stagger, fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Brain,
    title: 'Understands intent',
    body: 'Natural-language requests are parsed into goals, constraints, and budgets — no forms, no filters.',
    span: 'md:col-span-2',
    accent: 'from-neon-violet/20',
  },
  {
    icon: Workflow,
    title: 'Plans & decomposes',
    body: 'A planner agent breaks each request into ordered tasks and selects the right tools.',
    span: '',
    accent: 'from-neon-blue/20',
  },
  {
    icon: Boxes,
    title: 'Modular tools',
    body: 'Travel, maps, restaurants, shopping, calendar — each independently expandable.',
    span: '',
    accent: 'from-neon-pink/20',
  },
  {
    icon: MessageSquareText,
    title: 'Streams its thinking',
    body: 'Watch the agent search, compare, and reason in real time before it acts.',
    span: 'md:col-span-2',
    accent: 'from-neon-cyan/20',
  },
  {
    icon: Gauge,
    title: 'Compares for value',
    body: 'A recommendation engine ranks every option by price, rating, and fit.',
    span: '',
    accent: 'from-neon-violet/20',
  },
  {
    icon: ShieldCheck,
    title: 'Acts on approval',
    body: 'Nothing is booked or bought until you confirm. You stay in control.',
    span: '',
    accent: 'from-neon-blue/20',
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-6 py-section">
      <SectionHeading
        eyebrow="Why OMNIA"
        title={<>An assistant that <span className="text-gradient-cool">acts</span>, not just chats</>}
        subtitle="A true agent system — planning, tool selection, execution, and recommendations, working together."
      />

      <motion.div
        variants={stagger(0.07)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3"
      >
        {FEATURES.map((f) => (
          <motion.div key={f.title} variants={fadeUp} className={f.span}>
            <GlassCard
              glow
              className="group relative h-full overflow-hidden p-7 transition-transform duration-500 ease-expo hover:-translate-y-1"
            >
              <div
                className={cn(
                  'pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100',
                  f.accent,
                )}
              />
              <div className="relative">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <f.icon className="h-5 w-5 text-accent-soft" strokeWidth={1.7} />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/50">{f.body}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <Reveal delay={0.1} className="mx-auto mt-4 max-w-6xl">
        <p className="text-center text-sm text-white/30">
          Built on a swappable AI layer — Claude, GPT, or your own provider.
        </p>
      </Reveal>
    </section>
  );
}
