import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate } from "react-router-dom";
import {
  Flame,
  Target,
  Trophy,
  BookOpen,
  Bookmark,
  Clock,
  ChevronRight,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import mcqxLogo from "@/assets/mcqx-logo.jpg";

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

type Bookmark = {
  id: string;
  question_id: string;
  created_at: string;
  questions?: { text: string; chapter_id: string };
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

  // Fetch bookmarks
  const { data: bookmarks = [], isLoading: loadingBookmarks } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bookmarks")
        .select(`
          *,
          questions:question_id (text, chapter_id)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Bookmark[];
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
    return <Navigate to="/login" replace />;
  }

  const accuracy = profile?.total_attempts
    ? Math.round((profile.total_correct / profile.total_attempts) * 100)
    : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={mcqxLogo} alt="MCQX" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="neon" size="sm" asChild>
              <Link to="/practice">Practice</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4">
        <div className="container max-w-4xl">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold mb-2">
              Hey, {profile?.display_name || user.email?.split("@")[0]} 👋
            </h1>
            <p className="text-muted-foreground">Ready to crush some MCQs today?</p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="text-3xl font-bold neon-text-green">{profile?.streak_days || 0}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold">{profile?.total_attempts || 0}</div>
              <div className="text-sm text-muted-foreground">MCQs Cracked</div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div className="text-3xl font-bold">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl font-bold">{profile?.total_correct || 0}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Sessions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Sessions
                </h2>
              </div>

              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {session.chapters?.subjects?.icon || "📚"}
                        </span>
                        <div>
                          <div className="font-medium text-sm">
                            {session.chapters?.name || "Unknown Chapter"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(session.completed_at)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-accent">
                          {session.score}/{session.total_questions}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round((session.score / session.total_questions) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No sessions yet</p>
                  <Button variant="neon" size="sm" className="mt-3" asChild>
                    <Link to="/practice">Start Practicing</Link>
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Bookmarks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-primary" />
                  Bookmarked Questions
                </h2>
              </div>

              {loadingBookmarks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : bookmarks.length > 0 ? (
                <div className="space-y-3">
                  {bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <p className="text-sm line-clamp-2">
                        {bookmark.questions?.text || "Question unavailable"}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(bookmark.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No bookmarks yet</p>
                  <p className="text-xs mt-1">
                    Flag tricky questions to review later
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center"
          >
            <Button variant="neon" size="lg" asChild>
              <Link to="/practice" className="inline-flex items-center gap-2">
                Start New Practice
                <ChevronRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
