import { motion } from "framer-motion";
import { Award, Zap, Target, Trophy, Flame, Crown, Star, Brain } from "lucide-react";

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: typeof Award;
  unlocked: boolean;
  color: string;
};

type Props = {
  totalCorrect: number;
  totalAttempts: number;
  streakDays: number;
  challengeWins: number;
};

export function AchievementsBadges({ totalCorrect, totalAttempts, streakDays, challengeWins }: Props) {
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Define badges with unlock conditions
  const badges: Badge[] = [
    {
      id: "fast-thinker",
      name: "Fast Thinker",
      description: "Answer 50 questions",
      icon: Zap,
      unlocked: totalAttempts >= 50,
      color: "text-yellow-400",
    },
    {
      id: "accuracy-beast",
      name: "Accuracy Beast",
      description: "Achieve 80%+ accuracy",
      icon: Target,
      unlocked: accuracy >= 80 && totalAttempts >= 20,
      color: "text-green-400",
    },
    {
      id: "challenge-king",
      name: "Challenge King",
      description: "Win 5 challenges",
      icon: Crown,
      unlocked: challengeWins >= 5,
      color: "text-purple-400",
    },
    {
      id: "streak-master",
      name: "Streak Master",
      description: "7-day practice streak",
      icon: Flame,
      unlocked: streakDays >= 7,
      color: "text-orange-400",
    },
    {
      id: "century",
      name: "Century Club",
      description: "100 correct answers",
      icon: Trophy,
      unlocked: totalCorrect >= 100,
      color: "text-cyan-400",
    },
    {
      id: "rising-star",
      name: "Rising Star",
      description: "Complete first session",
      icon: Star,
      unlocked: totalAttempts >= 1,
      color: "text-pink-400",
    },
    {
      id: "brain-power",
      name: "Brain Power",
      description: "500 MCQs attempted",
      icon: Brain,
      unlocked: totalAttempts >= 500,
      color: "text-blue-400",
    },
  ];

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const lockedBadges = badges.filter((b) => !b.unlocked);

  if (unlockedBadges.length === 0) {
    return null; // Don't show section if no badges unlocked
  }

  return (
    <section className="mb-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="font-display text-xl font-bold mb-4 flex items-center gap-2"
      >
        <Award className="w-5 h-5 text-primary" />
        Achievements
      </motion.h2>

      {/* Horizontal scrolling badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.5 }}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {unlockedBadges.map((badge, i) => (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 + i * 0.05 }}
            whileHover={{ y: -3, scale: 1.05 }}
            className="glass rounded-xl p-4 flex flex-col items-center min-w-[100px] shrink-0 cursor-pointer group"
          >
            <div className={`w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
              <badge.icon className={`w-6 h-6 ${badge.color}`} />
            </div>
            <span className="text-xs font-medium text-center whitespace-nowrap">{badge.name}</span>
          </motion.div>
        ))}
        
        {/* Show next locked badge as teaser */}
        {lockedBadges.length > 0 && (() => {
          const LockedIcon = lockedBadges[0].icon;
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.5, scale: 1 }}
              transition={{ delay: 0.9 + unlockedBadges.length * 0.05 }}
              className="glass rounded-xl p-4 flex flex-col items-center min-w-[100px] shrink-0 opacity-50"
            >
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-2">
                <LockedIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-center text-muted-foreground whitespace-nowrap">
                {lockedBadges[0].name}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1">🔒 Locked</span>
            </motion.div>
          );
        })()}
      </motion.div>
    </section>
  );
}
