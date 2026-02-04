import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp, Minus, ChevronRight, Brain, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChapterStats {
  chapter_id: string;
  chapter_name: string;
  subject_name: string;
  subject_icon: string;
  total_attempts: number;
  correct_answers: number;
  accuracy: number;
  last_practiced: string | null;
  trend: "improving" | "declining" | "stable" | "new";
}

interface PerformanceResponse {
  performance: {
    chapters: ChapterStats[];
    overall_accuracy: number;
    total_questions_attempted: number;
    strongest_subject: string | null;
    weakest_subject: string | null;
  };
  insights: string | null;
  generated_at: string;
}

export function WeakAreasCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["performance-analysis"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-performance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch performance data");
      }

      return response.json() as Promise<PerformanceResponse>;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const getTrendIcon = (trend: ChapterStats["trend"]) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-3.5 h-3.5 text-accent" />;
      case "declining":
        return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy < 50) return "text-destructive";
    if (accuracy < 70) return "text-yellow-500";
    return "text-accent";
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  if (error || !data?.performance) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display font-bold text-lg">Weak Areas</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Practice more to unlock your performance insights! 📚
        </p>
      </motion.div>
    );
  }

  const weakChapters = data.performance.chapters.slice(0, 3);
  const hasEnoughData = data.performance.total_questions_attempted >= 10;

  if (!hasEnoughData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display font-bold text-lg">Weak Areas</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-muted-foreground text-sm mb-2">
            Complete {10 - data.performance.total_questions_attempted} more questions to unlock insights
          </p>
          <div className="w-full bg-muted/30 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (data.performance.total_questions_attempted / 10) * 100)}%` }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-destructive/10">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">Focus Areas</h3>
            <p className="text-xs text-muted-foreground">Chapters needing attention</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link to="/analytics" className="gap-1">
            See all
            <ChevronRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>

      {/* Weak Chapters List */}
      <div className="space-y-3">
        {weakChapters.map((chapter, index) => (
          <motion.div
            key={chapter.chapter_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
          >
            <span className="text-lg">{chapter.subject_icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{chapter.chapter_name}</p>
              <p className="text-xs text-muted-foreground">{chapter.subject_name}</p>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(chapter.trend)}
              <span className={`font-mono font-bold text-sm ${getAccuracyColor(chapter.accuracy)}`}>
                {chapter.accuracy}%
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="opacity-0 group-hover:opacity-100 transition-opacity px-2"
            >
              <Link to={`/practice?chapter=${chapter.chapter_id}`}>
                Practice
              </Link>
            </Button>
          </motion.div>
        ))}
      </div>

      {/* AI Insight Preview */}
      {data.insights && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">AI Insight</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {data.insights.split("\n")[0]?.replace(/^\d+\.\s*\[.*?\]\s*-?\s*/, "")}
          </p>
          <Button variant="link" size="sm" asChild className="px-0 h-auto mt-1 text-xs">
            <Link to="/analytics">View full analysis →</Link>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
