import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target, Flame, Award, Clock } from "lucide-react";

interface OverviewCardsProps {
  overallAccuracy: number;
  totalQuestions: number;
  strongestSubject: string | null;
  weakestSubject: string | null;
  streakDays?: number;
  avgTimePerQuestion?: number;
}

export function OverviewCards({
  overallAccuracy,
  totalQuestions,
  strongestSubject,
  weakestSubject,
  streakDays = 0,
  avgTimePerQuestion,
}: OverviewCardsProps) {
  const getAccuracyGrade = (accuracy: number) => {
    if (accuracy >= 90) return { grade: "A+", color: "text-accent", bg: "bg-accent/10" };
    if (accuracy >= 80) return { grade: "A", color: "text-accent", bg: "bg-accent/10" };
    if (accuracy >= 70) return { grade: "B", color: "text-primary", bg: "bg-primary/10" };
    if (accuracy >= 60) return { grade: "C", color: "text-yellow-500", bg: "bg-yellow-500/10" };
    return { grade: "D", color: "text-destructive", bg: "bg-destructive/10" };
  };

  const gradeInfo = getAccuracyGrade(overallAccuracy);

  const cards = [
    {
      label: "Overall Score",
      value: `${overallAccuracy}%`,
      subtitle: gradeInfo.grade,
      icon: Award,
      iconBg: gradeInfo.bg,
      iconColor: gradeInfo.color,
      highlight: true,
    },
    {
      label: "Questions Solved",
      value: totalQuestions.toLocaleString(),
      subtitle: "Total practice",
      icon: Target,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Strongest",
      value: strongestSubject || "—",
      subtitle: "Keep it up!",
      icon: TrendingUp,
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      truncate: true,
    },
    {
      label: "Needs Work",
      value: weakestSubject || "—",
      subtitle: "Focus here",
      icon: TrendingDown,
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
      truncate: true,
    },
    {
      label: "Current Streak",
      value: `${streakDays}`,
      subtitle: streakDays > 0 ? "days 🔥" : "Start today!",
      icon: Flame,
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
    },
    {
      label: "Avg. Speed",
      value: avgTimePerQuestion ? `${avgTimePerQuestion}s` : "—",
      subtitle: "per question",
      icon: Clock,
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`glass-card rounded-2xl p-4 ${
            card.highlight ? "ring-1 ring-primary/30" : ""
          }`}
        >
          <div className={`inline-flex p-2 rounded-xl ${card.iconBg} mb-3`}>
            <card.icon className={`w-4 h-4 ${card.iconColor}`} />
          </div>
          <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
          <p
            className={`font-display font-bold text-lg ${
              card.truncate ? "truncate" : ""
            } ${card.highlight ? card.iconColor : ""}`}
          >
            {card.value}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
}
