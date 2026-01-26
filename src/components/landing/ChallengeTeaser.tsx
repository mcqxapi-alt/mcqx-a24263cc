import { motion } from "framer-motion";
import { Swords, Users, Zap, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export function ChallengeTeaser() {
  const navigate = useNavigate();
  const [challengeCount, setChallengeCount] = useState(234);

  // Simulate live challenge count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setChallengeCount(prev => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 sm:py-24 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6"
            >
              <Swords className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-medium">Challenge Mode</span>
            </motion.div>
            
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Battle Your Friends in{" "}
              <span className="text-gradient-animated">Real-Time</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Create a challenge, share the link, and compete head-to-head on the same MCQs. May the fastest brain win!
            </p>
          </div>

          {/* Battle visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="relative glass rounded-3xl p-8 sm:p-12 border border-primary/20 mb-8"
          >
            <div className="flex items-center justify-between gap-4 sm:gap-8">
              {/* Player 1 */}
              <motion.div
                className="flex-1 text-center"
                initial={{ x: -30, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mx-auto mb-3 border-2 border-primary/50">
                  <span className="text-2xl sm:text-3xl">👤</span>
                </div>
                <div className="font-display font-bold text-lg sm:text-xl">You</div>
                <div className="text-muted-foreground text-sm">Challenger</div>
              </motion.div>

              {/* VS */}
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 300, delay: 0.5 }}
                className="relative"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center border-2 border-accent/50 shadow-[0_0_30px_hsl(var(--accent)/0.3)]">
                  <Swords className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
                </div>
                <motion.div
                  className="absolute -inset-2 rounded-full border border-accent/30"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              {/* Player 2 */}
              <motion.div
                className="flex-1 text-center"
                initial={{ x: 30, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center mx-auto mb-3 border-2 border-accent/50">
                  <span className="text-2xl sm:text-3xl">🎯</span>
                </div>
                <div className="font-display font-bold text-lg sm:text-xl">Friend</div>
                <div className="text-muted-foreground text-sm">Opponent</div>
              </motion.div>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                <span>10 MCQs</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="w-4 h-4 text-accent" />
                <span>Same Questions</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 text-primary" />
                <span>Real-time</span>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-muted-foreground">
                <span className="text-accent font-semibold">{challengeCount}</span> challenges happening now
              </span>
            </div>
            
            <Button
              variant="neon"
              size="xl"
              onClick={() => navigate("/challenge")}
              className="group"
            >
              <Swords className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
              Start a Challenge
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
