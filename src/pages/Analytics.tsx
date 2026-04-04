import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import { 
  ArrowLeft, Brain, Loader2, RefreshCw, Zap, Filter, 
  LayoutGrid, List, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import mcqxLogo from "@/assets/mcqx-logo.png";
import { useIsMobile } from "@/hooks/use-mobile";

// Analytics components
import { OverviewCards } from "@/components/analytics/OverviewCards";
import { AccuracyRadialChart } from "@/components/analytics/AccuracyRadialChart";
import { SubjectBreakdown } from "@/components/analytics/SubjectBreakdown";
import { ChapterTable } from "@/components/analytics/ChapterTable";
import { AIInsightsCard } from "@/components/analytics/AIInsightsCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { MobileChartsCarousel } from "@/components/analytics/MobileChartsCarousel";

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
  const isMobile = useIsMobile();

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

  // Get unique subjects for filter
  const subjects = data?.performance?.chapters
    ? [...new Set(data.performance.chapters.map(c => c.subject_name))]
    : [];

  // Filter chapters
  const filteredChapters = selectedSubject
    ? data?.performance?.chapters.filter(c => c.subject_name === selectedSubject)
    : data?.performance?.chapters;

  // Calculate totals
  const totalCorrect = data?.performance?.chapters?.reduce((sum, c) => sum + c.correct_answers, 0) || 0;
  const totalAttempts = data?.performance?.total_questions_attempted || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--neon-purple)/0.03)] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img 
              src={mcqxLogo} 
              alt="MCQX" 
              className="h-10 sm:h-12 w-auto group-hover:scale-105 transition-transform"
            />
            <span className="font-display font-bold text-lg hidden sm:block">MCQX</span>
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
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gradient">Performance Analytics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-3">
            Your Learning Journey
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            AI-powered insights to help you study smarter and achieve your goals faster
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="relative inline-flex">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/20 animate-ping" />
              </div>
              <p className="text-muted-foreground mt-4">Analyzing your performance...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          </div>
        ) : error || !data?.performance ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto"
          >
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-3">Start Your Journey!</h2>
            <p className="text-muted-foreground mb-6">
              Complete some practice sessions to unlock your personalized performance analytics and AI insights.
            </p>
            <Button size="lg" asChild className="gap-2">
              <Link to="/practice">
                <Zap className="w-5 h-5" />
                Start Practice
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <OverviewCards
              overallAccuracy={data.performance.overall_accuracy}
              totalQuestions={data.performance.total_questions_attempted}
              strongestSubject={data.performance.strongest_subject}
              weakestSubject={data.performance.weakest_subject}
            />

            {/* AI Insights - Prominent placement */}
            {data.insights && <AIInsightsCard insights={data.insights} />}

            {/* Charts - Mobile Carousel or Desktop Grid */}
            {isMobile ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <MobileChartsCarousel
                  accuracy={data.performance.overall_accuracy}
                  correct={totalCorrect}
                  incorrect={totalAttempts - totalCorrect}
                  chapters={data.performance.chapters}
                  selectedSubject={selectedSubject}
                />
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AccuracyRadialChart
                    accuracy={data.performance.overall_accuracy}
                    correct={totalCorrect}
                    incorrect={totalAttempts - totalCorrect}
                  />
                  <TrendChart chapters={data.performance.chapters} />
                </div>

                {/* Subject Breakdown - only on desktop since it's in carousel on mobile */}
                <SubjectBreakdown
                  chapters={data.performance.chapters}
                  selectedSubject={selectedSubject}
                />
              </>
            )}

            {/* Subject Filter */}
            {subjects.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filter by Subject</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedSubject === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubject(null)}
                    className="text-xs"
                  >
                    All Subjects
                  </Button>
                  {subjects.map(subject => (
                    <Button
                      key={subject}
                      variant={selectedSubject === subject ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSubject(subject)}
                      className="text-xs"
                    >
                      {subject}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Subject Breakdown - only show on desktop (mobile has it in carousel) */}
            {!isMobile && (
              <SubjectBreakdown
                chapters={data.performance.chapters}
                selectedSubject={selectedSubject}
              />
            )}

            {/* Detailed Chapter Table */}
            <ChapterTable chapters={filteredChapters || []} />

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass-card rounded-2xl p-6 sm:p-8 text-center"
              style={{ boxShadow: "0 0 60px hsl(var(--primary) / 0.1)" }}
            >
              <h3 className="font-display font-bold text-xl mb-2">Ready to Improve?</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Focus on your weak areas and watch your scores climb. Every practice session brings you closer to mastery.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" asChild className="gap-2">
                  <Link to="/practice">
                    <Zap className="w-5 h-5" />
                    Practice Now
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="gap-2">
                  <Link to="/dashboard">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
