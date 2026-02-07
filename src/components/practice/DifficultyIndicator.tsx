import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyBadge } from "./DifficultyBadge";

type DifficultyLevel = "easy" | "medium" | "hard";

interface DifficultyIndicatorProps {
  currentDifficulty: DifficultyLevel;
  previousDifficulty?: DifficultyLevel;
  showTrend?: boolean;
  className?: string;
}

export function DifficultyIndicator({
  currentDifficulty,
  previousDifficulty,
  showTrend = false,
  className,
}: DifficultyIndicatorProps) {
  const difficultyOrder: DifficultyLevel[] = ["easy", "medium", "hard"];
  const currentIndex = difficultyOrder.indexOf(currentDifficulty);
  const previousIndex = previousDifficulty ? difficultyOrder.indexOf(previousDifficulty) : currentIndex;
  
  const trend = currentIndex > previousIndex ? "up" : currentIndex < previousIndex ? "down" : "same";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DifficultyBadge difficulty={currentDifficulty} size="md" />
      
      {showTrend && previousDifficulty && trend !== "same" && (
        <motion.span
          initial={{ scale: 0, x: -10 }}
          animate={{ scale: 1, x: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            trend === "up" 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-amber-500/20 text-amber-400"
          )}
        >
          {trend === "up" ? (
            <>
              <TrendingUp className="w-3 h-3" />
              Level Up!
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3" />
              Adjusting
            </>
          )}
        </motion.span>
      )}
    </div>
  );
}
