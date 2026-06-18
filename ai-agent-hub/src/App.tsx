import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLenis } from '@/hooks/useLenis';
import { AuroraBackground } from '@/components/fx/AuroraBackground';
import { CustomCursor } from '@/components/fx/CustomCursor';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { LandingPage } from '@/pages/LandingPage';
import { authEnabled } from '@/lib/auth';

// Route-split the app surfaces so the landing page ships a lean initial bundle.
const ChatPage = lazy(() => import('@/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ItineraryPage = lazy(() => import('@/pages/ItineraryPage').then((m) => ({ default: m.ItineraryPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((m) => ({ default: m.AuthPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
    </div>
  );
}

export default function App() {
  useLenis();
  const location = useLocation();
  const isChat = location.pathname === '/chat';
  // Auth pages are full-screen (their own brand lockup) — no site nav/footer.
  const isAuth = location.pathname.startsWith('/sign-in') || location.pathname.startsWith('/sign-up');

  return (
    <div className="grain relative min-h-screen">
      <AuroraBackground />
      <CustomCursor />
      {!isAuth && <Navbar />}

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/itinerary" element={<ItineraryPage />} />
              {authEnabled && (
                <>
                  <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
                  <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
                </>
              )}
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>

      {!isChat && !isAuth && <Footer />}
    </div>
  );
}
