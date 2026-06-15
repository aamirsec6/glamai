import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { AgentsOverviewSection } from "@/components/landing/agents-overview-section";
import { VerticalsSection } from "@/components/landing/verticals-section";
import { AgentDetailsSection } from "@/components/landing/agent-details-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { GuaranteesSection } from "@/components/landing/guarantees-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FaqSection } from "@/components/landing/faq-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen">
      <LandingNav />
      <main>
        <HeroSection />
        <AgentsOverviewSection />
        <VerticalsSection />
        <AgentDetailsSection />
        <TestimonialsSection />
        <GuaranteesSection />
        <PricingSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
