import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Flame,
  Target,
  Swords,
  Crown,
  Medal,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import mcqxLogo from "@/assets/mcqx-logo.png";

type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_attempts: number;
  total_correct: number;
  accuracy: number;
  streak_days: number;
  challenge_wins: number;
};

type MetricTab = "accuracy" | "streak" | "attempts" | "wins";

const tabs: { value: MetricTab; label: string; icon: typeof Trophy }[] = [
  { value: "accuracy", label: "Accuracy", icon: Target },
  { value: "streak", label: "Streaks", icon: Flame },
  { value: "wins", label: "Wins", icon: Swords },
  { value: "attempts", label: "Questions", icon: Trophy },
];

function getMetricValue(entry: LeaderboardEntry, metric: MetricTab): string {
  switch (metric) {
    case "accuracy":
      return `${entry.accuracy}%`;
    case "streak":
      return `${entry.streak_days}d`;
    case "wins":
      return `${entry.challenge_wins}`;
    case "attempts":
      return `${entry.total_attempts}`;
  }
}

function getMetricLabel(metric: MetricTab): string {
  switch (metric) {
    case "accuracy":
      return "Accuracy";
    case "streak":
      return "Streak";
    case "wins":
      return "Wins";
    case "attempts":
      return "Solved";
  }
}

function getRankStyle(rank: number) {
  if (rank === 1) return "from-yellow-500/30 to-yellow-500/5 border-yellow-500/50 shadow-[0_0_20px_hsl(45_100%_50%/0.15)]";
  if (rank === 2) return "from-slate-300/20 to-slate-300/5 border-slate-300/40";
  if (rank === 3) return "from-amber-700/20 to-amber-700/5 border-amber-700/40";
  return "from-transparent to-transparent border-border/50";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_6px_hsl(45_100%_50%/0.6)]" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-mono text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const [metric, setMetric] = useState<MetricTab>("accuracy");
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard", metric],
    queryFn: async () => {
      if (metric === "wins") {
        const { data, error } = await supabase.rpc("get_leaderboard_by_wins", {
          p_limit: 50,
        });
        if (error) throw error;
        return (data || []) as LeaderboardEntry[];
      }
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_metric: metric,
        p_limit: 50,
      });
      if (error) throw error;
      return (data || []) as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });

  // Find current user's rank
  const userRank = user ? entries.findIndex((e) => e.user_id === user.id) + 1 : 0;
  const userEntry = user ? entries.find((e) => e.user_id === user.id) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-strong border-b border-border/30 sticky top-0 z-50">
        <div className="container flex items-center h-16 px-4 gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link to="/">
            <img src={mcqxLogo} alt="MCQX" className="h-24 sm:h-[7.5rem] w-auto" />
          </Link>
          <div className="flex-1" />
          <h1 className="font-display text-lg font-bold tracking-tight">Leaderboard</h1>
        </div>
      </header>

      <main className="container max-w-2xl px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Global Rankings</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold">
            Top <span className="neon-text">Performers</span>
          </h2>
          <p className="text-muted-foreground text-sm">See how you stack up against other students</p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricTab)}>
          <TabsList className="grid grid-cols-4 w-full bg-card border border-border/50">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Current user highlight */}
        {userEntry && userRank > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-4"
          >
            <div className="text-sm font-mono text-primary font-bold">#{userRank}</div>
            <Avatar className="h-9 w-9 border border-primary/30">
              <AvatarImage src={userEntry.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {(userEntry.display_name || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-primary truncate">You</p>
              <p className="text-xs text-muted-foreground">
                {getMetricValue(userEntry, metric)} {getMetricLabel(metric)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Leaderboard list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No rankings yet. Start practicing to appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = user && entry.user_id === user.id;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5) }}
                  className={`
                    flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border
                    bg-gradient-to-r ${getRankStyle(rank)}
                    ${isCurrentUser ? "ring-1 ring-primary/40" : ""}
                    transition-all duration-200 hover:bg-card/80
                  `}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center shrink-0">
                    <RankBadge rank={rank} />
                  </div>

                  {/* Avatar */}
                  <Avatar className={`h-9 w-9 shrink-0 ${rank <= 3 ? "border-2" : "border"} ${
                    rank === 1 ? "border-yellow-500/50" : rank === 2 ? "border-slate-300/40" : rank === 3 ? "border-amber-600/40" : "border-border/50"
                  }`}>
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-xs font-bold">
                      {(entry.display_name || "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isCurrentUser ? "text-primary" : ""}`}>
                      {isCurrentUser ? "You" : entry.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.total_attempts} questions · {entry.accuracy}% acc
                    </p>
                  </div>

                  {/* Metric value */}
                  <div className="text-right shrink-0">
                    <p className={`font-display font-bold text-base sm:text-lg ${
                      rank === 1 ? "text-yellow-400" : rank <= 3 ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {getMetricValue(entry, metric)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {getMetricLabel(metric)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
