import { motion } from "framer-motion";
import { Users, Check, Copy, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ConnectionStatus } from "@/hooks/useChallengeRealtime";

type ChallengeLobbyProps = {
  challengeId: string;
  isChallenger: boolean;
  challengerReady: boolean;
  opponentReady: boolean;
  challengerName: string;
  opponentName: string | null;
  chapterInfo: { name: string; subject_name: string } | null;
  questionCount: number;
  onReady: () => void;
  isSettingReady: boolean;
  connectionStatus: ConnectionStatus;
};

export function ChallengeLobby({
  challengeId,
  isChallenger,
  challengerReady,
  opponentReady,
  challengerName,
  opponentName,
  chapterInfo,
  questionCount,
  onReady,
  isSettingReady,
  connectionStatus,
}: ChallengeLobbyProps) {
  const { toast } = useToast();
  const myReady = isChallenger ? challengerReady : opponentReady;
  const theirReady = isChallenger ? opponentReady : challengerReady;
  const myName = isChallenger ? challengerName : (opponentName || "You");
  const theirName = isChallenger ? (opponentName || "Opponent") : challengerName;

  const copyShareLink = () => {
    const link = `${window.location.origin}/challenge/${challengeId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!", description: "Share it with your friend!" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="text-center py-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card mb-6"
      >
        <Users className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium">Live Duel Lobby</span>
        <span className="mx-1 text-muted-foreground">•</span>
        {connectionStatus === "connected" && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500 text-xs font-medium">Live</span>
          </div>
        )}
        {connectionStatus === "connecting" && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
            <span className="text-yellow-500 text-xs font-medium">Connecting...</span>
          </div>
        )}
        {connectionStatus === "reconnecting" && (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
            <span className="text-orange-500 text-xs font-medium">Reconnecting...</span>
          </div>
        )}
        {connectionStatus === "disconnected" && (
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 text-red-500" />
            <span className="text-red-500 text-xs font-medium">Disconnected</span>
          </div>
        )}
      </motion.div>

      <h2 className="font-display text-4xl font-bold mb-3">Ready to Battle?</h2>
      
      {chapterInfo && (
        <p className="text-primary font-medium mb-2">
          {chapterInfo.subject_name} • {chapterInfo.name}
        </p>
      )}
      
      <p className="text-muted-foreground mb-10">
        {questionCount} questions • Same questions • Same time
      </p>

      {/* VS Display */}
      <div className="flex items-center justify-center gap-6 mb-10">
        {/* Challenger */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`glass-card rounded-2xl p-6 w-40 ${
            challengerReady ? "border-2 border-green-500 shadow-[0_0_30px_hsl(142_71%_45%/0.2)]" : ""
          }`}
        >
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold ${
            challengerReady ? "bg-green-500/20 text-green-500" : "bg-secondary"
          }`}>
            {challengerReady ? <Check className="w-8 h-8" /> : challengerName.charAt(0).toUpperCase()}
          </div>
          <p className="font-semibold truncate">{isChallenger ? "You" : challengerName}</p>
          <p className={`text-sm ${challengerReady ? "text-green-500" : "text-muted-foreground"}`}>
            {challengerReady ? "Ready!" : "Waiting..."}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="text-3xl font-bold text-primary"
        >
          VS
        </motion.div>

        {/* Opponent */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`glass-card rounded-2xl p-6 w-40 ${
            opponentReady ? "border-2 border-green-500 shadow-[0_0_30px_hsl(142_71%_45%/0.2)]" : ""
          }`}
        >
          <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold ${
            opponentReady ? "bg-green-500/20 text-green-500" : "bg-secondary"
          }`}>
            {opponentReady ? <Check className="w-8 h-8" /> : opponentName ? opponentName.charAt(0).toUpperCase() : "?"}
          </div>
          <p className="font-semibold truncate">{!isChallenger ? "You" : (opponentName || "Opponent")}</p>
          <p className={`text-sm ${opponentReady ? "text-green-500" : "text-muted-foreground"}`}>
            {opponentReady ? "Ready!" : opponentName ? "Waiting..." : "Not joined"}
          </p>
        </motion.div>
      </div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-5 mb-8 max-w-md mx-auto text-left"
      >
        <h4 className="font-semibold mb-3 text-center">⚡ Battle Rules</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• Both players get the same questions in the same order</li>
          <li>• Game starts when both players are ready</li>
          <li>• Answers are locked once submitted</li>
          <li>• Winner is decided by accuracy, then speed</li>
        </ul>
      </motion.div>

      {/* Actions */}
      {opponentName ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {!myReady ? (
            <Button
              variant="neon"
              size="lg"
              className="h-14 px-12 text-lg"
              onClick={onReady}
              disabled={isSettingReady}
            >
              {isSettingReady ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Getting Ready...
                </>
              ) : (
                "I'm Ready!"
              )}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-500 font-semibold">
              <Check className="w-5 h-5" />
              <span>Waiting for opponent to ready up...</span>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <p className="text-muted-foreground">Share this link with your opponent:</p>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 max-w-md mx-auto">
            <input
              readOnly
              value={`${window.location.origin}/challenge/${challengeId}`}
              className="flex-1 bg-transparent text-sm truncate outline-none font-mono"
            />
            <Button variant="neon" size="sm" onClick={copyShareLink}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
