import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { 
  ArrowLeft, Brain, TrendingUp, TrendingDown, Minus, Target, 
  Sparkles, ChevronRight, Loader2, BarChart3, Zap, BookOpen,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import mcqxLogo from "@/assets/mcqx-logo.png";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell
} from "recharts";

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

export default function Analytics() {
  const { user, loading } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["performance-analysis-full"],
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
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getTrendIcon = (trend: ChapterStats["trend"]) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-accent" />;
      case "declining":
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (trend: ChapterStats["trend"]) => {
    switch (trend) {
      case "improving": return "Improving";
      case "declining": return "Declining";
      case "stable": return "Stable";
      default: return "New";
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy < 50) return "hsl(var(--destructive))";
    if (accuracy < 70) return "hsl(45, 100%, 50%)";
    return "hsl(var(--accent))";
  };

  // Get unique subjects
  const subjects = data?.performance?.chapters
    ? [...new Set(data.performance.chapters.map(c => c.subject_name))]
    : [];

  // Filter chapters by selected subject
  const filteredChapters = selectedSubject
    ? data?.performance?.chapters.filter(c => c.subject_name === selectedSubject)
    : data?.performance?.chapters;

  // Prepare chart data
  const chartData = filteredChapters?.slice(0, 10).map(c => ({
    name: c.chapter_name.length > 20 ? c.chapter_name.slice(0, 20) + "..." : c.chapter_name,
    accuracy: c.accuracy,
    attempts: c.total_attempts,
    fill: getAccuracyColor(c.accuracy),
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img 
              src={mcqxLogo} 
              alt="MCQX" 
              className="h-8 w-8 rounded-lg group-hover:scale-105 transition-transform"
            />
            <span className="font-display font-bold text-lg">MCQX</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Performance Analytics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-2">
            Your Learning Insights
          </h1>
          <p className="text-muted-foreground">
            AI-powered analysis to help you study smarter
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing your performance...</p>
            </div>
          </div>
        ) : error || !data?.performance ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-8 text-center"
          >
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Start Practicing!</h2>
            <p className="text-muted-foreground mb-4">
              Complete some practice sessions to see your performance analytics.
            </p>
            <Button asChild>
              <Link to="/practice">Start Practice</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Overview Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-primary">
                  {data.performance.overall_accuracy}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Overall Accuracy</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-3xl font-bold">
                  {data.performance.total_questions_attempted}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Questions Done</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-accent truncate">
                  {data.performance.strongest_subject || "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Strongest Subject</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-destructive truncate">
                  {data.performance.weakest_subject || "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Needs Work</p>
              </div>
            </motion.div>

            {/* AI Insights */}
            {data.insights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl p-6 border border-primary/20"
                style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.1)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">AI Study Coach</h2>
                    <p className="text-xs text-muted-foreground">Personalized recommendations</p>
                  </div>
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  {data.insights.split("\n").filter(line => line.trim()).map((line, i) => (
                    <p key={i} className="text-muted-foreground mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Subject Filter */}
            {subjects.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2"
              >
                <Button
                  variant={selectedSubject === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubject(null)}
                >
                  All Subjects
                </Button>
                {subjects.map(subject => (
                  <Button
                    key={subject}
                    variant={selectedSubject === subject ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubject(subject)}
                  >
                    {subject}
                  </Button>
                ))}
              </motion.div>
            )}

            {/* Accuracy Chart */}
            {chartData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">Chapter Accuracy</h2>
                    <p className="text-xs text-muted-foreground">Performance by chapter</p>
                  </div>
                </div>
                <div className="h-64 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={120} 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [`${value}%`, "Accuracy"]}
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Detailed Chapter List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">All Chapters</h2>
                    <p className="text-xs text-muted-foreground">
                      Sorted by accuracy (lowest first)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredChapters?.map((chapter, index) => (
                  <motion.div
                    key={chapter.chapter_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.03 }}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-xl">{chapter.subject_icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chapter.chapter_name}</p>
                      <p className="text-xs text-muted-foreground">{chapter.subject_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {chapter.total_attempts} attempts
                        </p>
                        <div className="flex items-center gap-1 justify-end">
                          {getTrendIcon(chapter.trend)}
                          <span className="text-xs text-muted-foreground">
                            {getTrendLabel(chapter.trend)}
                          </span>
                        </div>
                      </div>
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center border-4"
                        style={{ borderColor: getAccuracyColor(chapter.accuracy) }}
                      >
                        <span className="font-bold text-lg">{chapter.accuracy}%</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Link to={`/practice?chapter=${chapter.chapter_id}`}>
                          <Zap className="w-4 h-4 mr-1" />
                          Practice
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {(!filteredChapters || filteredChapters.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No chapters practiced yet in this subject.
                </div>
              )}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <Button size="lg" asChild className="gap-2">
                <Link to="/practice">
                  <Zap className="w-5 h-5" />
                  Start Practicing
                </Link>
              </Button>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
