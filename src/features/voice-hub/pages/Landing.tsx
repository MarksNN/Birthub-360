import type React from 'react';
import {
  BenefitsBentoGrid,
  ComparisonTable,
  HeroSection,
  HowItWorksTimeline,
  IntegrationsGrid,
  InteractiveAnalyticsSection,
  LandingFooter,
  LandingNavbar,
  MetricsBar,
  PricingFaqSection,
  ProductModulesSection,
  SecurityGovernanceSection,
} from '../components/landing/index.js';

export default function LandingPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-midnight text-white selection:bg-brand selection:text-midnight flex flex-col font-sans">
      <LandingNavbar />

      <main className="flex-1 flex flex-col">
        {/* Above the Fold: Carregamento síncrono imediato */}
        <HeroSection />
        <MetricsBar />

        {/* Seções Modulares de Domínio */}
        <BenefitsBentoGrid />
        <ProductModulesSection />
        <HowItWorksTimeline />
        <InteractiveAnalyticsSection />
        <ComparisonTable />
        <IntegrationsGrid />
        <SecurityGovernanceSection />
        <PricingFaqSection />
      </main>

      <LandingFooter />
    </div>
  );
}
