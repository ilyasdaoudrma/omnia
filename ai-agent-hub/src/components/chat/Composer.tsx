import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface ComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isRunning: boolean;
}

export function Composer({ onSend, onStop, isRunning }: ComposerProps) {
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { supported: voiceSupported, listening, toggle: toggleVoice, lang, cycleLang, error: voiceError } =
    useSpeechRecognition((text) => setValue(text));

  // Auto-grow the textarea.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || isRunning) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="glass-strong rounded-3xl p-2.5">
      {voiceError && <p className="px-3 pb-1 text-xs text-amber-300/80">{voiceError}. Allow mic access in your browser.</p>}
      <div className="flex items-end gap-2">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={listening ? 'Listening… speak now' : 'Make a wish — plan, find, compare, or order anything…'}
          className="max-h-40 flex-1 resize-none bg-transparent py-2.5 pl-3 text-[15px] text-white placeholder:text-white/35 focus:outline-none"
        />

        {voiceSupported && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={cycleLang}
              className="grid h-10 min-w-[44px] place-items-center rounded-2xl px-2 text-xs font-semibold text-white/45 transition-colors hover:bg-white/5 hover:text-white"
              title="Switch voice language (English / Français)"
              data-cursor="hover"
            >
              {lang === 'fr-FR' ? 'FR' : 'EN'}
            </button>
            <button
              onClick={toggleVoice}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-2xl transition-colors',
                listening ? 'bg-accent/20 text-accent-soft' : 'text-white/45 hover:bg-white/5 hover:text-white',
              )}
              title={listening ? 'Stop listening' : `Voice input (${lang === 'fr-FR' ? 'Français' : 'English'})`}
              data-cursor="hover"
            >
              {listening ? (
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/50" />
                  <Mic className="relative h-5 w-5" />
                </span>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>
        )}

        {isRunning ? (
          <button
            onClick={onStop}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/15"
            title="Stop"
            data-cursor="hover"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={submit}
            disabled={!value.trim()}
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition-all',
              value.trim()
                ? 'bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] text-white shadow-[0_6px_20px_-4px_rgba(212,175,55,0.6)]'
                : 'bg-white/8 text-white/30',
            )}
            title="Send"
            data-cursor="hover"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
