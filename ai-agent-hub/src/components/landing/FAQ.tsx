import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Reveal } from '@/components/fx/Reveal';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: 'How is this different from a normal chatbot?',
    a: 'OMNIA is a true agent system. It does not just reply — it plans, decomposes your request into tasks, selects tools, searches real services, compares options, and (with your approval) executes actions.',
  },
  {
    q: 'Does it actually book and buy things?',
    a: 'Yes — once connected to your accounts, the agent can complete bookings and orders. Nothing happens without your explicit confirmation on each action.',
  },
  {
    q: 'Which AI models power it?',
    a: 'It runs on Llama via Groq today. The AI layer is provider-agnostic, so other providers can be swapped in without touching the product.',
  },
  {
    q: 'Is my data and payment information safe?',
    a: 'Authentication is handled by Clerk, connected accounts are scoped and revocable, and the agent only acts within the permissions you grant.',
  },
  {
    q: 'What can it help me with right now?',
    a: 'Travel and stays, restaurants and delivery, rides and transport, shopping, and full multi-part plans like an entire weekend — all from one sentence.',
  },
];

function Item({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <Reveal>
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass w-full rounded-3xl px-6 py-5 text-left transition-colors hover:bg-white/[0.06]"
        data-cursor="hover"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-[15px] font-medium md:text-base">{q}</span>
          <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 transition-transform duration-300', open && 'rotate-45')}>
            <Plus className="h-4 w-4" />
          </span>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden text-[15px] leading-relaxed text-white/50"
            >
              <span className="block pt-4">{a}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </button>
    </Reveal>
  );
}

export function FAQ() {
  return (
    <section className="relative px-6 py-section">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <div className="mx-auto mt-12 grid max-w-3xl gap-3">
        {FAQS.map((f, i) => (
          <Item key={f.q} {...f} index={i} />
        ))}
      </div>
    </section>
  );
}
