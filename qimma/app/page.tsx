import SmoothScroll from "@/components/SmoothScroll";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Hero from "@/components/hero/Hero";
import ProblemPromise from "@/components/sections/ProblemPromise";
import AgentRoster from "@/components/sections/AgentRoster";
import HowItWorks from "@/components/sections/HowItWorks";
import FeatureStories from "@/components/sections/FeatureStories";
import CaseStudies from "@/components/sections/CaseStudies";
import Verticals from "@/components/sections/Verticals";
import FAQ from "@/components/sections/FAQ";
import FinalCTA from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <SmoothScroll>
      <SiteNav />
      <main>
        <Hero />
        <ProblemPromise />
        <AgentRoster />
        <HowItWorks />
        <FeatureStories />
        <CaseStudies />
        <Verticals />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
    </SmoothScroll>
  );
}
