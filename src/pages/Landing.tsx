import { motion } from "framer-motion";
import { BookOpen, Trophy, ChevronRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
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
  return (
    <div className="min-h-screen gradient-mesh">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={mcqxLogo} alt="MCQX" className="h-14 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="neon" size="sm" asChild>
              <Link to="/practice">Start Practice</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                CBSE Class 12 • Verified + AI-powered MCQs
              </span>
            </motion.div>

            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Crack your MCQs.{" "}
              <span className="neon-text">Flex your score.</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto text-balance">
              Practice unlimited MCQs, get instant feedback, and challenge your friends. No signup needed to start.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="neon" size="xl" asChild>
                <Link to="/practice">
                  Start Practice
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="neon-outline" size="xl" asChild>
                <Link to="/login">Sign In for Streaks</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex items-center justify-center gap-8 md:gap-16 mt-16"
          >
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-3xl md:text-4xl font-bold neon-text-green">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4">
        <div className="container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground">Three steps to MCQ mastery</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                <div className="glass rounded-2xl p-8 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--neon-cyan)/0.15)]">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="font-display text-sm text-primary mb-2">
                    Step {i + 1}
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">
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
      <section className="py-20 px-4">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative max-w-3xl mx-auto text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-3xl opacity-50" />
            <div className="relative glass rounded-3xl p-12 border border-primary/20">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Ready to become <span className="neon-text">unstoppable</span>?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join thousands of students crushing their exams. No signup required to start practicing.
              </p>
              <Button variant="neon" size="xl" asChild>
                <Link to="/practice">
                  Start Practice Now
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">MCQX</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">About</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 MCQX. Built for students.
          </p>
        </div>
      </footer>
    </div>
  );
}
