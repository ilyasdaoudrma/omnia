import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Sparkles } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { isSignedIn } from '@/lib/market';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';
import { LocationBar } from './LocationBar';
import { UsageMeter } from './UsageMeter';
import { SuggestedActions } from './SuggestedActions';
import { ClarifyChips } from './ClarifyChips';
import { RecommendationCard } from '@/components/agent/RecommendationCard';
import { CheckoutCard } from '@/components/agent/CheckoutCard';
import { ManageCard } from '@/components/agent/ManageCard';
import { ScheduledCard } from '@/components/agent/ScheduledCard';
import { MenuCard } from '@/components/agent/MenuCard';
import { stagger } from '@/lib/motion';

export function ChatInterface() {
  const { messages, recommendations, checkout, clarify, manage, scheduled, menu, isRunning, error, sendMessage, stop, personalization, loadPersonalization, refreshConversations } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull the user's "usual"/proactive history + saved conversations when the chat
  // opens. Clerk loads asynchronously (lazy), so poll briefly until the session is
  // ready, then load once — otherwise a signed-in user sees no banner / no history
  // after a refresh because the first call ran before Clerk was available.
  useEffect(() => {
    let loaded = false;
    let ticks = 0;
    const tryLoad = () => {
      if (loaded || !isSignedIn()) return;
      loaded = true;
      void loadPersonalization();
      void refreshConversations();
    };
    tryLoad();
    const id = setInterval(() => {
      tryLoad();
      if (loaded || ++ticks > 12) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [loadPersonalization, refreshConversations]);
  // Only auto-scroll when the user is already at the bottom — never yank them
  // down while they're reading scrolled-up content.
  const stickToBottom = useRef(true);
  const showSuggestions = messages.length <= 1;

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    // Instant (not smooth) so the auto-scroll lands exactly at the bottom and
    // its own scroll events don't get misread as the user scrolling up.
    if (stickToBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, recommendations, checkout, clarify, manage, scheduled, menu, isRunning]);

  return (
    <div className="flex h-full flex-col">
      {/* data-lenis-prevent stops the global smooth-scroll lib from hijacking
          wheel events inside the chat, so this panel scrolls natively. */}
      <div ref={scrollRef} onScroll={onScroll} data-lenis-prevent className="flex-1 space-y-6 overflow-y-auto px-1 py-4">
        {messages.map((m, i) => (
          <MessageBubble key={m.id} message={m} streaming={isRunning && i === messages.length - 1} />
        ))}

        {/* Confirm-ready receipt (1–2 actions) the agent assembled */}
        <AnimatePresence>{checkout && checkout.length > 0 && <CheckoutCard drafts={checkout} />}</AnimatePresence>

        {/* Confirm a change to an existing order/booking (cancel / modify) */}
        <AnimatePresence>{manage && <ManageCard action={manage} />}</AnimatePresence>

        {/* A recurring task the agent just scheduled */}
        <AnimatePresence>{scheduled && <ScheduledCard recurrence={scheduled} />}</AnimatePresence>

        {/* A vendor's visual menu */}
        <AnimatePresence>{menu && <MenuCard menu={menu} />}</AnimatePresence>

        {/* Clarifying question — agent asks before guessing an ambiguous follow-up */}
        <AnimatePresence>
          {clarify && !isRunning && <ClarifyChips options={clarify.options} onPick={(t) => sendMessage(t)} />}
        </AnimatePresence>

        {/* Inline recommendations under the latest answer */}
        <AnimatePresence>
          {recommendations.length > 0 && (
            <motion.div
              variants={stagger(0.08)}
              initial="hidden"
              animate="show"
              className="ml-11 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {recommendations.map((r) => (
                <RecommendationCard key={r.id} rec={r} compact />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="ml-11 flex items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {showSuggestions && (
          <div className="ml-11 max-w-2xl pt-2">
            {personalization.proactive && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => sendMessage(personalization.proactive!.prompt)}
                className="mb-4 flex w-full items-start gap-3 rounded-2xl border border-accent/40 bg-accent/[0.08] p-4 text-left text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/[0.13]"
                data-cursor="hover"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 text-accent-soft">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>
                  <span className="mb-0.5 block text-xs uppercase tracking-[0.18em] text-accent-soft/80">For you</span>
                  <span className="text-white/85">{personalization.proactive.text}</span>
                </span>
              </motion.button>
            )}
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/35">Try asking</p>
            <SuggestedActions onPick={(t) => sendMessage(t)} />
          </div>
        )}
      </div>

      <div className="pt-3">
        <LocationBar />
        <UsageMeter />
        <Composer onSend={(t) => sendMessage(t)} onStop={stop} isRunning={isRunning} />
        <p className="mt-2 text-center text-xs text-white/30">
          The agent asks for confirmation before booking or buying. Running in{' '}
          <span className="text-white/50">
            {(import.meta.env.VITE_AI_PROVIDER ?? 'mock')} mode
          </span>
          .
        </p>
      </div>
    </div>
  );
}
