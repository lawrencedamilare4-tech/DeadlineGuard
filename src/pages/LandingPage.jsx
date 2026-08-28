import React, { useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import {
  GlobalStyle,
  Hero,
  ProofSection,
  PipelineSection,
  ProviderDiagram,
  ForecastSection,
  FinalCTA,
  Footer,
  LandingStorm,
} from '../components/landing/LandingPageSections';
import { COLORS } from '../utils/constants';

export function LandingPage() {
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  return (
    <div className="dg-scope min-h-screen" style={{ background: COLORS.canvas, color: COLORS.text }}>
      <GlobalStyle />
      <Navbar />
      <main>
        <Hero />
        <LandingStorm />
        <ProofSection />
        <PipelineSection />
        <ProviderDiagram />
        <LandingStorm />
        <ForecastSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;