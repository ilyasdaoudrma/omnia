import { Globe } from 'lucide-react';
import { LOCALES, useT } from '@/lib/i18n';

/** Compact EN / FR / AR language switcher. */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useT();
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5 ${className}`}>
      <Globe className="ml-1.5 h-3.5 w-3.5 text-white/40" />
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLocale(l.code)}
          aria-pressed={locale === l.code}
          title={l.label}
          data-cursor="hover"
          className={
            'rounded-full px-2 py-1 text-xs font-medium transition-colors ' +
            (locale === l.code ? 'bg-accent/20 text-accent-soft' : 'text-white/55 hover:text-white')
          }
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
