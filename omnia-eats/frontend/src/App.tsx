import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLenis } from '@/hooks/useLenis';
import { AuroraBackground } from '@/components/fx/AuroraBackground';
import { CustomCursor } from '@/components/fx/CustomCursor';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { VendorPage } from '@/pages/VendorPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { AuthPage } from '@/pages/AuthPage';
import { authEnabled } from '@/lib/auth';

export default function App() {
  useLenis();
  const location = useLocation();

  return (
    <div className="grain relative min-h-screen">
      <AuroraBackground />
      <CustomCursor />
      <Navbar />
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/vendor/:id" element={<VendorPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            {authEnabled && (
              <>
                <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
                <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
              </>
            )}
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
