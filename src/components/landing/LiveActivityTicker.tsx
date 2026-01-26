import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Zap, Star } from "lucide-react";

const activities = [
  { name: "Priya", score: 92, subject: "Physics", icon: Zap },
  { name: "Rahul", score: 88, subject: "Chemistry", icon: Flame },
  { name: "Ananya", score: 95, subject: "Math", icon: Star },
  { name: "Arjun", score: 90, subject: "Biology", icon: Trophy },
  { name: "Sneha", score: 85, subject: "German", icon: Zap },
  { name: "Vikram", score: 100, subject: "Physics", icon: Star },
  { name: "Meera", score: 88, subject: "Chemistry", icon: Flame },
  { name: "Karan", score: 92, subject: "Math", icon: Trophy },
];

export function LiveActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const activity = activities[currentIndex];
  const Icon = activity.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="flex items-center justify-center mt-8"
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20">
        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{activity.name}</span>
              {" "}just scored{" "}
              <span className="text-accent font-semibold">{activity.score}%</span>
              {" "}in {activity.subject}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
