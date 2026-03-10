import { motion } from "framer-motion";
import { Crown, Swords, Trophy, Clock, RotateCcw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { VictoryConfetti } from "./VictoryConfetti";
import { useToast } from "@/hooks/use-toast";

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
  challengeChapterId?: string;
  totalQuestions?: number;
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
  totalQuestions,
}: ChallengeResultProps) {
  const { toast } = useToast();
  const result = determineWinner(myScore, theirScore, myTimeMs, theirTimeMs);
  const showConfetti = isComplete && result === "win";

  return (
    <>
      <VictoryConfetti trigger={showConfetti} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4 px-2 relative"
      >
      {isComplete && result ? (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            {result === "win" ? (
              <Crown className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-yellow-500" />
            ) : result === "draw" ? (
              <Swords className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-primary" />
            ) : (
              <Trophy className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-muted-foreground" />
            )}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-display text-2xl sm:text-3xl font-bold mt-4"
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
              className="text-muted-foreground text-sm mt-1"
            >
              {chapterInfo.subject_name} • {chapterInfo.name}
            </motion.p>
          )}

          {/* Score comparison - Compact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-5 sm:gap-8 py-6"
          >
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">You</p>
              <p className="font-display text-4xl sm:text-5xl font-bold neon-text">{myScore}</p>
              <div className="flex items-center justify-center gap-1 mt-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{formatTime(myTimeMs)}</span>
              </div>
            </div>
            
            <div className="text-2xl font-bold text-muted-foreground">vs</div>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">{theirName}</p>
              <p className="font-display text-4xl sm:text-5xl font-bold text-muted-foreground">{theirScore}</p>
              <div className="flex items-center justify-center gap-1 mt-1.5 text-xs text-muted-foreground">
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
              className="text-xs text-muted-foreground mb-4"
            >
              Same score — {result === "win" ? "you were faster!" : "opponent was faster!"}
            </motion.p>
          )}
        </>
      ) : (
        <>
          <Trophy className="w-16 h-16 mx-auto text-primary" />
          <h2 className="font-display text-2xl font-bold mt-4">Challenge Complete!</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Your score: <span className="font-bold text-primary">{myScore}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Waiting for opponent to complete...
          </p>
        </>
      )}

      {/* Actions - Stack on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center mt-6"
      >
        <Button variant="neon-outline" size="lg" className="h-11" asChild>
          <Link to="/challenge">New Challenge</Link>
        </Button>
        <Button variant="neon" size="lg" className="h-11" asChild>
          <Link to="/practice">Practice More</Link>
        </Button>
      </motion.div>

      {/* Guest Sign-In Nudge */}
      {showGuestNudge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card rounded-xl p-4 flex items-center justify-between gap-3 mt-5"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">Save this battle!</p>
              <p className="text-xs text-muted-foreground">
                Sign in to track wins
              </p>
            </div>
          </div>
          <Button variant="neon" size="sm" className="shrink-0" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </motion.div>
      )}
      </motion.div>
    </>
  );
}
