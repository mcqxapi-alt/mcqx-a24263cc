import { motion } from "framer-motion";
import { ChevronRight, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { AnimatedCounter } from "./AnimatedCounter";
import { LiveActivityTicker } from "./LiveActivityTicker";
import { FloatingElements } from "./FloatingElements";

const stats = [
  { value: "12,435+", label: "Students" },
  { value: "20,000+", label: "MCQs" },
  { value: "5.2M", label: "Solved" },
];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-32 sm:pt-40 pb-12 sm:pb-20 px-4 overflow-hidden">
      <FloatingElements />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass border border-primary/30 mb-6 sm:mb-8 animate-bounce-subtle"
          >
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary animate-pulse" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              CBSE Class 12 • Verified + AI-powered MCQs
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-display text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
          >
            Crack your MCQs.{" "}
            <span className="text-gradient-animated">Flex your score.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto text-balance px-2"
          >
            Practice unlimited MCQs, get instant feedback, and challenge your friends. No signup needed to start.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Button variant="neon" size="xl" asChild className="group">
              <Link to="/practice">
                Start Practice
                <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              variant="neon-outline"
              size="xl"
              className="group"
              onClick={() => navigate("/challenge")}
            >
              <Swords className="w-5 h-5 mr-2" />
              Challenge a Friend
            </Button>
          </motion.div>

          {/* Live Activity Ticker */}
          <LiveActivityTicker />
        </motion.div>

        {/* Animated Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="flex items-center justify-center gap-6 sm:gap-8 md:gap-16 mt-10 sm:mt-16"
        >
          {stats.map((stat, i) => (
            <AnimatedCounter
              key={i}
              value={stat.value}
              label={stat.label}
              delay={i}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
