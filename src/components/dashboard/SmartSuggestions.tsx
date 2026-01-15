import { motion } from "framer-motion";
import { Sparkles, ChevronRight, BookOpen, Swords, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Suggestion = {
  type: "practice" | "challenge" | "quick";
  title: string;
  description: string;
  chapterId?: string;
};

type Props = {
  suggestions?: Suggestion[];
  lastPracticeDate: string | null;
  weakAreas?: { name: string; accuracy: number; chapterId: string }[];
};

export function SmartSuggestions({ lastPracticeDate, weakAreas = [] }: Props) {
  // Generate smart suggestions based on user data
  const generateSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    // If user hasn't practiced recently
    if (!lastPracticeDate) {
      suggestions.push({
        type: "practice",
        title: "Start Your Journey",
        description: "Begin practicing to unlock personalized recommendations!",
      });
    } else {
      const lastDate = new Date(lastPracticeDate);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince >= 2) {
        suggestions.push({
          type: "practice",
          title: "Welcome Back!",
          description: `It's been ${daysSince} days. Let's get back on track!`,
        });
      }
    }

    // Add weak area suggestions
    if (weakAreas.length > 0) {
      const weakest = weakAreas[0];
      suggestions.push({
        type: "practice",
        title: `Improve ${weakest.name}`,
        description: `Your accuracy dropped to ${weakest.accuracy}%. Time to fix it!`,
        chapterId: weakest.chapterId,
      });
    }

    // Always add a challenge suggestion
    suggestions.push({
      type: "challenge",
      title: "Challenge Mode",
      description: "Test your skills against friends in real-time!",
    });

    // Quick test for busy users
    suggestions.push({
      type: "quick",
      title: "Short on Time?",
      description: "Try a quick 10-question sprint!",
    });

    return suggestions.slice(0, 3);
  };

  const suggestions = generateSuggestions();

  const getIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "practice":
        return BookOpen;
      case "challenge":
        return Swords;
      case "quick":
        return Zap;
    }
  };

  return (
    <section className="mb-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="font-display text-xl font-bold mb-4 flex items-center gap-2"
      >
        <Sparkles className="w-5 h-5 text-primary" />
        Recommended for You
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suggestions.map((suggestion, i) => {
          const Icon = getIcon(suggestion.type);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75 + i * 0.05, duration: 0.5 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="glass rounded-2xl p-5 cursor-pointer group hover:border-primary/40 transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="w-full mt-4 group">
                <Link to="/practice" className="flex items-center justify-center gap-2">
                  {suggestion.type === "challenge" ? "Start Challenge" : "Practice Now"}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
