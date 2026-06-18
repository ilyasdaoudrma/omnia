import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/fx/Reveal';
import { Button } from '@/components/ui/Button';
import { scaleIn } from '@/lib/motion';

export function CTA() {
  return (
    <section className="relative px-6 py-section">
      <Reveal variants={scaleIn} className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 px-8 py-20 text-center">
          {/* glow field */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[120%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(212,175,55,0.35),transparent_60%)] blur-2xl" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-display-lg font-bold tracking-tight text-balance">
              Stop browsing. <span className="text-gradient">Start asking.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-balance text-lg text-white/55">
              Your personal agent is one sentence away. Tell it what you want — it takes care of the rest.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/chat">
                <Button size="lg" magnetic className="gap-2">
                  Launch your agent <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="outline">
                  See pricing
                </Button>
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
