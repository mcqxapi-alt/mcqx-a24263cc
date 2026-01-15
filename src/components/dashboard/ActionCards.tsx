import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, Swords, Timer, ChevronRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActionCards() {
  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Practice MCQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="glass rounded-2xl p-6 border-l-4 border-l-primary hover:border-primary/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold">Practice MCQs</h3>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            Sharpen your accuracy, one question at a time.
          </p>
          <Button variant="neon" size="sm" asChild className="w-full group">
            <Link to="/practice" className="flex items-center justify-center gap-2">
              ▶ Start Practice
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>

        {/* Live Challenge - Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="glass rounded-2xl p-6 border-2 border-accent/50 relative overflow-hidden group"
        >
          {/* Animated glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center animate-pulse-slow">
                <Swords className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display text-xl font-bold neon-text-green">Live Challenge</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-5">
              Same questions. Same time. One winner.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="neon" size="sm" asChild className="w-full group">
                <Link to="/practice" className="flex items-center justify-center gap-2">
                  <Swords className="w-4 h-4" />
                  Challenge a Friend
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full group">
                <Link to="/practice" className="flex items-center justify-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Join via Link
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Quick Test */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, scale: 1.02 }}
          className="glass rounded-2xl p-6 border-l-4 border-l-primary hover:border-primary/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Timer className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-display text-xl font-bold">Quick Test</h3>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            10 questions. 10 minutes. Let's go!
          </p>
          <Button variant="neon" size="sm" asChild className="w-full group">
            <Link to="/practice" className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Start Now
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
