import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { BrowseMenu } from "@/components/landing/BrowseMenu";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ChallengeTeaser } from "@/components/landing/ChallengeTeaser";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-mesh-animated">
      <Navbar />
      <HeroSection />
      <BrowseMenu />
      <HowItWorks />
      <ChallengeTeaser />
      <CTASection />
      <Footer />
    </div>
  );
}
