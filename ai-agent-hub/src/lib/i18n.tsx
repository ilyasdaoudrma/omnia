import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'fr' | 'ar';

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'ar', label: 'العربية', short: 'AR' },
];

type Dict = Record<string, string>;

// Key user-facing strings. English is the source/fallback; FR + AR provided.
const STRINGS: Record<Locale, Dict> = {
  en: {
    'nav.stays': 'Stays',
    'nav.eats': 'Eats',
    'nav.rides': 'Rides',
    'nav.dashboard': 'Dashboard',
    'cta.launch': 'Launch agent',
    'cta.askAgent': 'Ask the agent',
    'cta.signin': 'Sign in',
    'chat.placeholder': 'Make a wish — a trip, a meal, a ride…',
    'chat.greeting':
      "Hey — I'm OMNIA. Make a wish in plain language (a trip, a meal, a ride, a whole weekend) and I'll plan it, compare real options near you, and get it ready.",
    'dash.welcome': 'Welcome back',
    'dash.title': 'Your command center',
    'rewards.title': 'OMNIA Rewards',
  },
  fr: {
    'nav.stays': 'Séjours',
    'nav.eats': 'Repas',
    'nav.rides': 'Trajets',
    'nav.dashboard': 'Tableau de bord',
    'cta.launch': "Lancer l'agent",
    'cta.askAgent': "Demander à l'agent",
    'cta.signin': 'Se connecter',
    'chat.placeholder': 'Faites un vœu — un voyage, un repas, un trajet…',
    'chat.greeting':
      "Bonjour — je suis OMNIA. Exprimez un souhait en langage naturel (un voyage, un repas, un trajet, un week-end entier) et je le planifie, compare les options réelles près de vous et le prépare.",
    'dash.welcome': 'Bon retour',
    'dash.title': 'Votre centre de commande',
    'rewards.title': 'OMNIA Rewards',
  },
  ar: {
    'nav.stays': 'الإقامة',
    'nav.eats': 'الطعام',
    'nav.rides': 'التنقّل',
    'nav.dashboard': 'لوحة التحكم',
    'cta.launch': 'ابدأ المساعد',
    'cta.askAgent': 'اسأل المساعد',
    'cta.signin': 'تسجيل الدخول',
    'chat.placeholder': 'تمنَّ ما تريد — رحلة، وجبة، توصيلة…',
    'chat.greeting':
      'مرحباً — أنا OMNIA. عبّر عن رغبتك بكلماتك (رحلة، وجبة، توصيلة، عطلة نهاية أسبوع كاملة) وسأخطط لها، وأقارن خيارات حقيقية قريبة منك، وأجهّزها.',
    'dash.welcome': 'مرحباً بعودتك',
    'dash.title': 'مركز التحكّم الخاص بك',
    'rewards.title': 'مكافآت OMNIA',
  },
};

interface LocaleCtx {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
  t: (key: keyof (typeof STRINGS)['en'] | string) => string;
}

const Ctx = createContext<LocaleCtx>({ locale: 'en', dir: 'ltr', setLocale: () => {}, t: (k) => String(k) });

export function LocaleProvider({ children }: { children: ReactNode }) {
  // English-only: locale is fixed to 'en' (the language switcher was removed).
  const [locale, setLocaleState] = useState<Locale>('en');
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

  // Keep <html lang>/<dir> in sync (always en/ltr now).
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const t = useCallback((key: string) => STRINGS[locale][key] ?? STRINGS.en[key] ?? key, [locale]);

  const value = useMemo(() => ({ locale, dir, setLocale, t }), [locale, dir, setLocale, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT() {
  return useContext(Ctx);
}
