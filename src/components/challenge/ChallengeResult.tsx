import { motion } from "framer-motion";
import { Crown, Swords, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type ChallengeResultProps = {
  isChallenger: boolean;
  myScore: number | null;
  theirScore: number | null;
  myTimeMs: number | null;
  theirTimeMs: number | null;
  myName: string;
  theirName: string;
  chapterInfo: { name: string; subject_name: string } | null;
  isComplete: boolean;
  showGuestNudge: boolean;
};

function formatTime(ms: number | null): string {
  if (ms === null) return "--:--";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function determineWinner(
  myScore: number | null,
  theirScore: number | null,
  myTimeMs: number | null,
  theirTimeMs: number | null
): "win" | "lose" | "draw" | null {
  if (myScore === null || theirScore === null) return null;
  
  // Primary: Accuracy
  if (myScore > theirScore) return "win";
  if (myScore < theirScore) return "lose";
  
  // Secondary: Speed (lower is better)
  if (myTimeMs !== null && theirTimeMs !== null) {
    if (myTimeMs < theirTimeMs) return "win";
    if (myTimeMs > theirTimeMs) return "lose";
  }
  
  return "draw";
}

export function ChallengeResult({
  isChallenger,
  myScore,
  theirScore,
  myTimeMs,
  theirTimeMs,
  myName,
  theirName,
  chapterInfo,
  isComplete,
  showGuestNudge,
}: ChallengeResultProps) {
  const result = determineWinner(myScore, theirScore, myTimeMs, theirTimeMs);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      {isComplete && result ? (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            {result === "win" ? (
              <Crown className="w-20 h-20 mx-auto text-yellow-500" />
            ) : result === "draw" ? (
              <Swords className="w-20 h-20 mx-auto text-primary" />
            ) : (
              <Trophy className="w-20 h-20 mx-auto text-muted-foreground" />
            )}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-4xl font-bold mt-6"
          >
            {result === "win" ? (
              <span className="text-yellow-500">🏆 Victory!</span>
            ) : result === "draw" ? (
              <span className="text-primary">🤝 It's a Draw!</span>
            ) : (
              <span className="text-muted-foreground">😤 Almost there!</span>
            )}
          </motion.h2>

          {chapterInfo && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground mt-2"
            >
              {chapterInfo.subject_name} • {chapterInfo.name}
            </motion.p>
          )}

          {/* Score comparison */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-8 py-8"
          >
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">You</p>
              <p className="font-display text-5xl font-bold neon-text">{myScore}</p>
              <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatTime(myTimeMs)}</span>
              </div>
            </div>
            
            <div className="text-3xl font-bold text-muted-foreground">vs</div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{theirName}</p>
              <p className="font-display text-5xl font-bold text-muted-foreground">{theirScore}</p>
              <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatTime(theirTimeMs)}</span>
              </div>
            </div>
          </motion.div>

          {/* Winner explanation */}
          {result !== "draw" && myScore === theirScore && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground mb-6"
            >
              Same score — {result === "win" ? "you were faster!" : "opponent was faster!"}
            </motion.p>
          )}
        </>
      ) : (
        <>
          <Trophy className="w-20 h-20 mx-auto text-primary" />
          <h2 className="font-display text-3xl font-bold mt-6">Challenge Complete!</h2>
          <p className="text-muted-foreground mt-2">
            Your score: <span className="font-bold text-primary">{myScore}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Waiting for opponent to complete...
          </p>
        </>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex gap-3 justify-center mt-8"
      >
        <Button variant="neon-outline" size="lg" asChild>
          <Link to="/challenge">New Challenge</Link>
        </Button>
        <Button variant="neon" size="lg" asChild>
          <Link to="/practice">Practice More</Link>
        </Button>
      </motion.div>

      {/* Guest Sign-In Nudge */}
      {showGuestNudge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card rounded-xl p-5 flex items-center justify-between gap-4 mt-6 mx-auto max-w-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Save this battle!</p>
              <p className="text-sm text-muted-foreground">
                Sign in to track your wins
              </p>
            </div>
          </div>
          <Button variant="neon" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
