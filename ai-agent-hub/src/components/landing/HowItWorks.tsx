import { motion } from 'framer-motion';
import { MessageSquare, GitBranch, Wrench, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { stagger, fadeUp } from '@/lib/motion';

const STEPS = [
  { icon: MessageSquare, title: 'You ask', body: 'Describe the outcome in plain language.' },
  { icon: GitBranch, title: 'Planner decomposes', body: 'The request becomes ordered, scoped tasks.' },
  { icon: Wrench, title: 'Tool selection', body: 'The agent picks the right tools per task.' },
  { icon: Cpu, title: 'Execution', body: 'It searches services and gathers live options.' },
  { icon: Sparkles, title: 'Recommendation', body: 'Results are compared and ranked for value.' },
  { icon: CheckCircle2, title: 'You approve', body: 'On confirmation, the agent executes the action.' },
];

export function HowItWorks() {
  return (
    <section className="relative px-6 py-section">
      <SectionHeading
        eyebrow="The agent loop"
        title={<>From sentence to <span className="text-gradient">done</span></>}
        subtitle="A transparent pipeline you can watch end to end — every step visible, every action on your approval."
      />

      <motion.ol
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto mt-16 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {STEPS.map((s, i) => (
          <motion.li
            key={s.title}
            variants={fadeUp}
            className="group relative rounded-3xl border border-white/10 bg-white/[0.03] p-7"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,rgba(154,123,30,0.25),rgba(241,217,138,0.18))]">
                <s.icon className="h-5 w-5 text-white" strokeWidth={1.7} />
              </span>
              <span className="font-mono text-sm text-white/25">0{i + 1}</span>
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-white/50">{s.body}</p>

            {/* connector */}
            <span className="absolute -right-2 top-1/2 hidden h-px w-4 -translate-y-1/2 bg-gradient-to-r from-white/30 to-transparent lg:block" />
          </motion.li>
        ))}
      </motion.ol>
    </section>
  );
}
