import { PageTransition } from '@/components/fx/PageTransition';
import { EyePortalHero } from '@/components/landing/EyePortalHero';
import { Features } from '@/components/landing/Features';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { AppsShowcase } from '@/components/landing/AppsShowcase';
import { DemoShowcase } from '@/components/landing/DemoShowcase';
import { Stats } from '@/components/landing/Stats';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { CreatorSection } from '@/components/landing/CreatorSection';

export function LandingPage() {
  return (
    <PageTransition>
      <EyePortalHero />
      <Features />
      <HowItWorks />
      <AppsShowcase />
      <DemoShowcase />
      <Stats />
      <Pricing />
      <FAQ />
      <CTA />
      <CreatorSection />
    </PageTransition>
  );
}
