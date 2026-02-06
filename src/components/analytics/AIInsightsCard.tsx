import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, Lightbulb, Target, TrendingUp, AlertTriangle } from "lucide-react";

interface AIInsightsCardProps {
  insights: string;
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse insights into structured sections
  const parseInsights = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    const sections: { icon: typeof Lightbulb; title: string; content: string; type: string }[] = [];

    lines.forEach((line) => {
      const cleanLine = line.replace(/^\d+\.\s*/, "").replace(/\[.*?\]\s*-?\s*/, "").trim();
      if (!cleanLine) return;

      // Categorize based on keywords
      if (line.toLowerCase().includes("weak") || line.toLowerCase().includes("struggle") || line.toLowerCase().includes("focus")) {
        sections.push({
          icon: AlertTriangle,
          title: "Focus Area",
          content: cleanLine,
          type: "warning",
        });
      } else if (line.toLowerCase().includes("strong") || line.toLowerCase().includes("excellent") || line.toLowerCase().includes("great")) {
        sections.push({
          icon: TrendingUp,
          title: "Strength",
          content: cleanLine,
          type: "success",
        });
      } else if (line.toLowerCase().includes("recommend") || line.toLowerCase().includes("suggest") || line.toLowerCase().includes("try")) {
        sections.push({
          icon: Target,
          title: "Recommendation",
          content: cleanLine,
          type: "primary",
        });
      } else {
        sections.push({
          icon: Lightbulb,
          title: "Insight",
          content: cleanLine,
          type: "default",
        });
      }
    });

    return sections.slice(0, 5); // Limit to 5 insights
  };

  const parsedInsights = parseInsights(insights);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case "warning":
        return "border-yellow-500/20 bg-yellow-500/5";
      case "success":
        return "border-accent/20 bg-accent/5";
      case "primary":
        return "border-primary/20 bg-primary/5";
      default:
        return "border-border bg-muted/10";
    }
  };

  const getIconStyles = (type: string) => {
    switch (type) {
      case "warning":
        return "text-yellow-500 bg-yellow-500/10";
      case "success":
        return "text-accent bg-accent/10";
      case "primary":
        return "text-primary bg-primary/10";
      default:
        return "text-muted-foreground bg-muted/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 0 40px hsl(var(--primary) / 0.08)" }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">AI Study Coach</h3>
            <p className="text-sm text-muted-foreground">
              {parsedInsights.length} personalized insights
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-3">
              {parsedInsights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${getTypeStyles(insight.type)}`}
                >
                  <div className={`p-2 rounded-lg ${getIconStyles(insight.type)}`}>
                    <insight.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {insight.title}
                    </p>
                    <p className="text-sm leading-relaxed">{insight.content}</p>
                  </div>
                </motion.div>
              ))}

              {parsedInsights.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keep practicing to unlock more personalized insights!
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
