import { motion } from "framer-motion";
import { Zap, Target, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type DifficultyLevel = "easy" | "medium" | "hard";

interface DifficultyBadgeProps {
  difficulty: DifficultyLevel;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

export function DifficultyBadge({ 
  difficulty, 
  className,
  showIcon = true,
  size = "sm"
}: DifficultyBadgeProps) {
  const config = {
    easy: {
      label: "Easy",
      icon: Zap,
      color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      glow: "shadow-[0_0_10px_hsl(160,84%,39%,0.3)]",
    },
    medium: {
      label: "Medium",
      icon: Target,
      color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      glow: "shadow-[0_0_10px_hsl(38,92%,50%,0.3)]",
    },
    hard: {
      label: "Hard",
      icon: Flame,
      color: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      glow: "shadow-[0_0_10px_hsl(356,100%,66%,0.3)]",
    },
  };

  const { label, icon: Icon, color, glow } = config[difficulty] || config.medium;

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        color,
        glow,
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
    >
      {showIcon && <Icon className={cn(size === "sm" ? "w-3 h-3" : "w-4 h-4")} />}
      {label}
    </motion.span>
  );
}
