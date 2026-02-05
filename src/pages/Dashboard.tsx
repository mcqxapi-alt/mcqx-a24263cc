import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Dashboard Components
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HeroStats } from "@/components/dashboard/HeroStats";
import { ActionCards } from "@/components/dashboard/ActionCards";
import { PerformanceSection } from "@/components/dashboard/PerformanceSection";
import { ChallengeArena } from "@/components/dashboard/ChallengeArena";
import { SmartSuggestions } from "@/components/dashboard/SmartSuggestions";
import { AchievementsBadges } from "@/components/dashboard/AchievementsBadges";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { WeakAreasCard } from "@/components/dashboard/WeakAreasCard";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  streak_days: number;
  total_attempts: number;
  total_correct: number;
  last_practice_date: string | null;
};

type Session = {
  id: string;
  chapter_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  chapters?: { name: string; subjects?: { name: string; icon: string } };
};

type Challenge = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  completed_at: string | null;
  status: string;
};

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  // Fetch user profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });

  // Fetch recent sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["sessions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          *,
          chapters:chapter_id (
            name,
            subjects:subject_id (name, icon)
          )
        `)
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Session[];
    },
    enabled: !!user,
  });

  // Fetch challenges for wins/losses
  const { data: challenges = [] } = useQuery({
    queryKey: ["challenges", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .eq("status", "finished")
        .order("completed_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Challenge[];
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  // Show loading state
  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ message: "Sign in to see your streaks, saved scores & challenges!" }} replace />;
  }

  // Calculate stats
  const accuracy = profile?.total_attempts
    ? Math.round((profile.total_correct / profile.total_attempts) * 100)
    : 0;

  // Calculate challenge wins/losses
  const challengeWins = challenges.filter(c => {
    if (c.challenger_id === user.id) {
      return (c.challenger_score || 0) > (c.opponent_score || 0);
    }
    return (c.opponent_score || 0) > (c.challenger_score || 0);
  }).length;

  const challengeLosses = challenges.filter(c => {
    if (c.challenger_id === user.id) {
      return (c.challenger_score || 0) < (c.opponent_score || 0);
    }
    return (c.opponent_score || 0) < (c.challenger_score || 0);
  }).length;

  // Format challenges for display
  const recentChallenges = challenges.slice(0, 4).map(c => {
    const isChallenger = c.challenger_id === user.id;
    const userScore = isChallenger ? (c.challenger_score || 0) : (c.opponent_score || 0);
    const opponentScore = isChallenger ? (c.opponent_score || 0) : (c.challenger_score || 0);
    return {
      id: c.id,
      opponentName: "Opponent", // We'd need to join profiles for real names
      won: userScore > opponentScore,
      userScore,
      opponentScore,
      completedAt: c.completed_at || new Date().toISOString(),
    };
  });

  return (
    <div className="min-h-screen gradient-mesh-animated">
      {/* Header */}
      <DashboardHeader
        displayName={profile?.display_name || null}
        avatarUrl={profile?.avatar_url || null}
        email={user.email}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />

      <main className="pt-24 sm:pt-28 pb-12 px-4">
        <div className="container max-w-5xl">
          {/* Hero Section - Your Today Panel */}
          <HeroStats
            displayName={profile?.display_name || null}
            email={user.email}
            accuracy={accuracy}
            totalAttempts={profile?.total_attempts || 0}
            challengeWins={challengeWins}
            challengeLosses={challengeLosses}
            streakDays={profile?.streak_days || 0}
          />

          {/* Primary Action Zone */}
          <ActionCards />

          {/* Performance & Insights */}
          <PerformanceSection
            totalAttempts={profile?.total_attempts || 0}
            totalCorrect={profile?.total_correct || 0}
          />

          {/* Challenge Arena & Weak Areas */}
          <section className="mb-8">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="font-display text-xl font-bold mb-4 flex items-center gap-2"
            >
              ⚔️ Battle & Focus
            </motion.h2>
            <div className="grid md:grid-cols-2 gap-4">
            <ChallengeArena
              recentChallenges={recentChallenges}
              currentStreak={profile?.streak_days || 0}
            />
            <WeakAreasCard />
            </div>
          </section>

          {/* AI Smart Suggestions */}
          <SmartSuggestions
            lastPracticeDate={profile?.last_practice_date || null}
          />

          {/* Badges & Achievements */}
          <AchievementsBadges
            totalCorrect={profile?.total_correct || 0}
            totalAttempts={profile?.total_attempts || 0}
            streakDays={profile?.streak_days || 0}
            challengeWins={challengeWins}
          />

          {/* Recent Sessions */}
          <RecentSessions
            sessions={sessions}
            isLoading={loadingSessions}
          />

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-border/30 text-center text-sm text-muted-foreground">
            <div className="flex justify-center gap-6">
              <a href="#" className="hover:text-primary transition-colors">Help</a>
              <a href="#" className="hover:text-primary transition-colors">Feedback</a>
              <a href="#" className="hover:text-primary transition-colors">About MCQX</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
