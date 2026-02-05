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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-accent/10">
          <Swords className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg">Challenge Arena</h3>
          <p className="text-xs text-muted-foreground">Battle history & streaks</p>
        </div>
      </div>

      {/* Recent Challenges */}
      <div className="flex-1">
        <h4 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5" />
          Recent Battles
        </h4>

        {recentChallenges.length > 0 ? (
          <div className="space-y-2">
            {recentChallenges.slice(0, 3).map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    challenge.won ? 'bg-accent/20' : 'bg-destructive/20'
                  }`}>
                    {challenge.won ? (
                      <Crown className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Swords className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      vs {challenge.opponentName}
                      <Badge variant={challenge.won ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {challenge.won ? "W" : "L"}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDate(challenge.completedAt)}
                    </div>
                  </div>
                </div>
                <div className={`font-mono font-semibold text-sm ${challenge.won ? 'text-accent' : 'text-destructive'}`}>
                  {challenge.userScore}–{challenge.opponentScore}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Swords className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No challenges yet</p>
            <p className="text-[10px] mt-0.5">Challenge a friend!</p>
          </div>
        )}
      </div>

      {/* Streak Mini-Display */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={`w-5 h-5 ${currentStreak >= 3 ? 'text-accent animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-xs text-muted-foreground">Win Streak</p>
              <p className={`font-bold text-lg leading-none ${currentStreak >= 3 ? 'text-accent' : ''}`}>
                {currentStreak}
              </p>
            </div>
          </div>
          {currentStreak >= 3 && (
            <span className="text-xs text-accent font-medium">🔥 On fire!</span>
          )}
          {longestStreak > 0 && currentStreak < 3 && (
            <span className="text-[10px] text-muted-foreground">Best: {longestStreak}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
