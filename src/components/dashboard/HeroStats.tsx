import { motion } from "framer-motion";
import { Target, BookOpen, Swords } from "lucide-react";

type Props = {
  displayName: string | null;
  email: string | undefined;
  accuracy: number;
  totalAttempts: number;
  challengeWins: number;
  challengeLosses: number;
  streakDays: number;
};

export function HeroStats({
  displayName,
  email,
  accuracy,
  totalAttempts,
  challengeWins,
  challengeLosses,
  streakDays,
}: Props) {
  const name = displayName || email?.split("@")[0] || "Champ";

  // Dynamic subtext based on user state
  const getSubtext = () => {
    if (streakDays >= 3) {
      return `🔥 ${streakDays} day streak! Keep it going!`;
    }
    if (challengeWins > challengeLosses) {
      return "You're on a roll. Ready for another win?";
    }
    if (totalAttempts === 0) {
      return "Time to start your MCQ journey!";
    }
    return "Ready to crush some MCQs today?";
  };

  const stats = [
    {
      icon: Target,
      value: `${accuracy}%`,
      label: "Overall Accuracy",
      color: "primary",
    },
    {
      icon: BookOpen,
      value: totalAttempts.toLocaleString(),
      label: "MCQs Attempted",
      color: "accent",
    },
    {
      icon: Swords,
      value: `${challengeWins}W – ${challengeLosses}L`,
      label: "Live Challenges",
      color: "primary",
    },
  ];

  return (
    <section className="mb-8">
      {/* Welcome Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
          Welcome back, {name} 👋
        </h1>
        <p className="text-muted-foreground text-lg">{getSubtext()}</p>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, scale: 1.02 }}
            className="glass rounded-2xl p-5 transition-all duration-300 hover:border-primary/40"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}/20 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
