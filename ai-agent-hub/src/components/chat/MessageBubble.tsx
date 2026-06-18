import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { ChatMessage } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

export function MessageBubble({ message, streaming }: { message: ChatMessage; streaming?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <span
        className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-semibold',
          isUser ? 'bg-white/10 text-white/80' : 'bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] text-white',
        )}
      >
        {isUser ? 'You' : <Sparkles className="h-4 w-4" />}
      </span>

      <div
        className={cn(
          'max-w-[78%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed',
          isUser ? 'rounded-tr-md bg-white/10 text-white' : 'glass rounded-tl-md text-white/85',
        )}
      >
        {message.content || (streaming && !isUser ? <ThinkingDots /> : null)}
        {streaming && !isUser && message.content && (
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />
        )}
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent-soft"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}
