import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'en' | 'fr' | 'ar';

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'ar', label: 'العربية', short: 'AR' },
];

type Dict = Record<string, string>;

const STRINGS: Record<Locale, Dict> = {
  en: {
    'nav.explore': 'Explore',
    'nav.account': 'My orders',
    'nav.agent': 'Open agent',
    'cta.chooseCity': 'Choose your city',
    'hero.title1': 'Order in,',
    'hero.title2': 'instantly.',
    'city.heading': 'Where are you hungry?',
  },
  fr: {
    'nav.explore': 'Explorer',
    'nav.account': 'Mes commandes',
    'nav.agent': "Ouvrir l'agent",
    'cta.chooseCity': 'Choisissez votre ville',
    'hero.title1': 'Commandez,',
    'hero.title2': 'en un instant.',
    'city.heading': 'Quelle est votre envie ?',
  },
  ar: {
    'nav.explore': 'استكشف',
    'nav.account': 'طلباتي',
    'nav.agent': 'افتح المساعد',
    'cta.chooseCity': 'اختر مدينتك',
    'hero.title1': 'اطلب الآن،',
    'hero.title2': 'في لحظة.',
    'city.heading': 'أين تشعر بالجوع؟',
  },
};

interface LocaleCtx {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const Ctx = createContext<LocaleCtx>({ locale: 'en', dir: 'ltr', setLocale: () => {}, t: (k) => String(k) });

export function LocaleProvider({ children }: { children: ReactNode }) {
  // English-only: locale is fixed to 'en' (the language switcher was removed).
  const [locale, setLocaleState] = useState<Locale>('en');
  const dir: 'ltr' | 'rtl' = locale === 'ar' ? 'rtl' : 'ltr';

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
