import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Activity, X } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { HistorySidebar } from '@/components/chat/HistorySidebar';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { AgentActivityCenter } from '@/components/agent/AgentActivityCenter';
import { useAgentStore } from '@/store/agentStore';
import { cn } from '@/lib/utils';

type Drawer = 'history' | 'activity' | null;

/**
 * Slide-in panel for narrow screens — reuses the same History / Activity panels
 * that sit in the desktop 3-column layout, so memory and the live tool activity
 * are always reachable (not just on ≥1024px viewports).
 */
function MobileDrawer({ side, open, onClose, children }: { side: 'left' | 'right'; open: boolean; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={cn(
              'absolute top-0 flex h-[100svh] w-[88vw] max-w-[360px] flex-col bg-ink-950/95 p-4 pt-6 shadow-2xl',
              side === 'left' ? 'left-0 border-r border-white/10' : 'right-0 border-l border-white/10',
            )}
            initial={{ x: side === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'left' ? '-100%' : '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
              aria-label="Close"
              data-cursor="hover"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ChatPage() {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const isRunning = useAgentStore((s) => s.isRunning);
  const conversationId = useAgentStore((s) => s.conversationId);

  // Close the History drawer once a conversation is picked (it sets conversationId).
  useEffect(() => {
    setDrawer((d) => (d === 'history' ? null : d));
  }, [conversationId]);

  // Esc closes whatever drawer is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PageTransition>
      <div data-lenis-prevent className="mx-auto h-[100svh] max-w-[1600px] px-4 pb-4 pt-24">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_360px]">
          {/* History (desktop) */}
          <div className="hidden min-h-0 lg:block">
            <HistorySidebar />
          </div>

          {/* Conversation */}
          <div className="flex min-h-0 flex-col">
            {/* Mobile toolbar — gives access to memory + live activity below lg */}
            <div className="mb-3 flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setDrawer('history')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white/80 transition hover:bg-white/[0.08]"
                data-cursor="hover"
              >
                <History className="h-4 w-4 text-accent-soft" /> Memory
              </button>
              <button
                onClick={() => setDrawer('activity')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white/80 transition hover:bg-white/[0.08]"
                data-cursor="hover"
              >
                <Activity className="h-4 w-4 text-accent-soft" /> Activity
                {isRunning && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <ChatInterface />
            </div>
          </div>

          {/* Live activity (desktop) */}
          <div className="hidden min-h-0 lg:block">
            <AgentActivityCenter />
          </div>
        </div>
      </div>

      {/* Drawers (mobile / narrow only) */}
      <MobileDrawer side="left" open={drawer === 'history'} onClose={() => setDrawer(null)}>
        <HistorySidebar />
      </MobileDrawer>
      <MobileDrawer side="right" open={drawer === 'activity'} onClose={() => setDrawer(null)}>
        <AgentActivityCenter />
      </MobileDrawer>
    </PageTransition>
  );
}
