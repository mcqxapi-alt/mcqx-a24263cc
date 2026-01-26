import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { SubjectCarousel } from "@/components/landing/SubjectCarousel";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ChallengeTeaser } from "@/components/landing/ChallengeTeaser";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-mesh-animated">
      <Navbar />
      <HeroSection />
      <SubjectCarousel />
      <HowItWorks />
      <ChallengeTeaser />
      <CTASection />
      <Footer />
    </div>
  );
}
