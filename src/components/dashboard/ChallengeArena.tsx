import { motion } from "framer-motion";
import { Trophy, Flame, Swords, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Challenge = {
  id: string;
  opponentName: string;
  won: boolean;
  userScore: number;
  opponentScore: number;
  completedAt: string;
};

type Props = {
  recentChallenges: Challenge[];
  currentStreak: number;
  longestStreak?: number;
};

export function ChallengeArena({
  recentChallenges = [],
  currentStreak,
  longestStreak = 0,
}: Props) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <section className="mb-8">
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="font-display text-xl font-bold mb-4 flex items-center gap-2"
      >
        <Swords className="w-5 h-5 text-accent" />
        Challenge Arena
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Challenges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Recent Challenges
          </h3>

          {recentChallenges.length > 0 ? (
            <div className="space-y-3">
              {recentChallenges.slice(0, 4).map((challenge, i) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary/70 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      challenge.won ? 'bg-accent/20' : 'bg-destructive/20'
                    }`}>
                      {challenge.won ? (
                        <Crown className="w-4 h-4 text-accent" />
                      ) : (
                        <Swords className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm flex items-center gap-2">
                        vs {challenge.opponentName}
                        <Badge variant={challenge.won ? "default" : "destructive"} className="text-xs">
                          {challenge.won ? "Won" : "Lost"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(challenge.completedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${challenge.won ? 'text-accent' : 'text-destructive'}`}>
                      {challenge.userScore}–{challenge.opponentScore}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Swords className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No challenges yet</p>
              <p className="text-xs mt-1">Challenge a friend to get started!</p>
            </div>
          )}
        </motion.div>

        {/* Streak Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="glass rounded-2xl p-5 relative overflow-hidden"
        >
          {/* Fire glow effect */}
          {currentStreak >= 3 && (
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/20 rounded-full blur-3xl animate-pulse-slow" />
          )}
          
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2 relative z-10">
            <Flame className="w-4 h-4 text-orange-500" />
            Win Streak
          </h3>

          <div className="flex flex-col items-center justify-center py-4 relative z-10">
            <div className="flex items-center gap-2">
              <Flame className={`w-10 h-10 ${currentStreak >= 3 ? 'text-orange-500 animate-pulse' : 'text-muted-foreground'}`} />
              <span className={`text-5xl font-bold ${currentStreak >= 3 ? 'neon-text-green' : ''}`}>
                {currentStreak}
              </span>
            </div>
            <p className="text-muted-foreground mt-2">
              {currentStreak >= 3 ? (
                <span className="text-accent font-medium">🔥 You're on fire!</span>
              ) : currentStreak > 0 ? (
                "Keep winning to build your streak!"
              ) : (
                "Win a challenge to start your streak!"
              )}
            </p>
            {longestStreak > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Longest streak: {longestStreak} wins
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
