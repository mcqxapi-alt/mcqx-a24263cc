import { motion } from "framer-motion";
import { Loader2, Trophy } from "lucide-react";

type ChallengeWaitProps = {
  score: number;
  totalQuestions: number;
  opponentProgress: number;
};

export function ChallengeWait({ score, totalQuestions, opponentProgress }: ChallengeWaitProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-10 px-4"
    >
      <motion.div
        className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-8"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-dashed border-primary/40"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-2 border-dotted border-accent/30"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </motion.div>

      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">You're Done!</h2>
      
      <div className="flex items-center justify-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <span className="text-xl font-bold text-primary">{score}/{totalQuestions}</span>
      </div>

      <p className="text-muted-foreground text-sm sm:text-base mb-4">
        Waiting for opponent to finish...
      </p>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-4 max-w-xs mx-auto"
      >
        <p className="text-xs text-muted-foreground mb-2">Opponent progress</p>
        <div className="relative h-2.5 rounded-full bg-secondary/50 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-muted-foreground/50 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(opponentProgress / totalQuestions) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {opponentProgress}/{totalQuestions} answered
        </p>
      </motion.div>

      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-xs text-muted-foreground mt-6"
      >
        🔥 Opponent is still battling...
      </motion.p>
    </motion.div>
  );
}
