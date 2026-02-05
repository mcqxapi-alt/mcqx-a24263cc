import { motion } from "framer-motion";
import { BarChart3, Timer } from "lucide-react";

type Props = {
  totalAttempts: number;
  totalCorrect: number;
  avgTimePerQuestion?: number; // in seconds
};

export function PerformanceSection({
  totalAttempts,
  totalCorrect,
  avgTimePerQuestion = 42,
}: Props) {
  const incorrect = totalAttempts - totalCorrect;
  const correctPercent = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const incorrectPercent = totalAttempts > 0 ? Math.round((incorrect / totalAttempts) * 100) : 0;

  return (
    <section className="mb-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="font-display text-xl font-bold mb-4 flex items-center gap-2"
      >
        <BarChart3 className="w-5 h-5 text-primary" />
        Your Performance
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Accuracy Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-4">Accuracy Breakdown</h3>
          
          {totalAttempts > 0 ? (
            <div className="space-y-3">
              {/* Correct */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-accent">Correct</span>
                  <span className="font-medium">{correctPercent}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${correctPercent}%` }}
                  />
                </div>
              </div>
              
              {/* Incorrect */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-destructive">Incorrect</span>
                  <span className="font-medium">{incorrectPercent}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive rounded-full transition-all duration-500"
                    style={{ width: `${incorrectPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No data yet. Start practicing!
            </div>
          )}
        </motion.div>

        {/* Speed Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Speed Stats
          </h3>
          
          <div className="flex flex-col items-center justify-center py-2">
            <div className="text-4xl font-bold text-primary">{avgTimePerQuestion}s</div>
            <div className="text-sm text-muted-foreground mt-1">Avg Time / Question</div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Speed matters in challenges. Keep practicing! ⚡
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
