import { motion } from "framer-motion";
import { BookOpen, Trophy, ChevronRight, Sparkles, Zap, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import mcqxLogo from "@/assets/mcqx-logo.jpg";

const stats = [
  { value: "12,435", label: "Students" },
  { value: "20,000+", label: "MCQs" },
  { value: "5.2M", label: "Solved" },
];

const steps = [
  { icon: BookOpen, title: "Pick a chapter", description: "Choose from any subject" },
  { icon: Zap, title: "Smash MCQs", description: "Instant feedback on each" },
  { icon: Trophy, title: "Track & flex", description: "Save streaks, challenge friends" },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

const handleChallengeClick = () => {
    navigate("/challenge");
  };

  return (
    <div className="min-h-screen gradient-mesh-animated">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
        <div className="container flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-105">
            <img src={mcqxLogo} alt="MCQX" className="h-16 sm:h-20 w-auto" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="neon" size="sm" asChild className="text-xs sm:text-sm px-2 sm:px-4">
              <Link to="/practice">Start Practice</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass border border-primary/30 mb-6 sm:mb-8 animate-bounce-subtle"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary animate-pulse" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                CBSE Class 12 • Verified + AI-powered MCQs
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
            >
              Crack your MCQs.{" "}
              <span className="neon-text animate-glow">Flex your score.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto text-balance px-2"
            >
              Practice unlimited MCQs, get instant feedback, and challenge your friends. No signup needed to start.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
              <Button variant="neon" size="xl" asChild className="group">
                <Link to="/practice">
                  Start Practice
                  <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="neon-outline" size="xl" className="group" onClick={handleChallengeClick}>
                <Swords className="w-5 h-5 mr-2" />
                Challenge a Friend
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center gap-6 sm:gap-8 md:gap-16 mt-10 sm:mt-16"
          >
            {stats.map((stat, i) => (
              <motion.div 
                key={i} 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="font-display text-2xl sm:text-3xl md:text-4xl font-bold neon-text-green">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-12 sm:py-20 px-4">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              How it works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Three steps to MCQ mastery</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
              >
                <div className="glass rounded-2xl p-8 h-full transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_40px_hsl(var(--neon-cyan)/0.15)] hover:-translate-y-1">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="font-display text-sm text-primary mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                    Step {i + 1}
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-3xl mx-auto text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-3xl opacity-50 animate-pulse-slow" />
            <div className="relative glass rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-primary/20 hover:border-primary/40 transition-all duration-500">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Ready to become <span className="neon-text">unstoppable</span>?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
                Join thousands of students crushing their exams. No signup required to start practicing.
              </p>
              <Button variant="neon" size="xl" asChild className="group">
                <Link to="/practice">
                  Start Practice Now
                  <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 border-t border-border/50">
        <div className="container flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-sm sm:text-base">MCQX</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors duration-300">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors duration-300">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors duration-300">About</a>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2025 MCQX. Built for students.
          </p>
        </div>
      </footer>
    </div>
  );
}
