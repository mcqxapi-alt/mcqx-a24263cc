import { motion } from "framer-motion";
import { Users, Check, Copy, Loader2, WifiOff, LogOut } from "lucide-react";
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
  onLeaveDuel: () => void;
  isSettingReady: boolean;
  isLeaving: boolean;
  connectionStatus: ConnectionStatus;
  isStarting: boolean;
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
  onLeaveDuel,
  isSettingReady,
  isLeaving,
  connectionStatus,
  isStarting,
}: ChallengeLobbyProps) {
  const { toast } = useToast();
  const myReady = isChallenger ? challengerReady : opponentReady;

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
      className="text-center py-4 px-2"
    >
      {/* Status Badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card mb-4"
      >
        <Users className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">Live Duel</span>
        <span className="mx-0.5 text-muted-foreground">•</span>
        {connectionStatus === "connected" && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500 text-xs font-medium">Live</span>
          </div>
        )}
        {connectionStatus === "connecting" && (
          <div className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
            <span className="text-yellow-500 text-xs">Connecting</span>
          </div>
        )}
        {connectionStatus === "reconnecting" && (
          <div className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
            <span className="text-orange-500 text-xs">Reconnecting</span>
          </div>
        )}
        {connectionStatus === "disconnected" && (
          <div className="flex items-center gap-1">
            <WifiOff className="w-3 h-3 text-red-500" />
            <span className="text-red-500 text-xs">Offline</span>
          </div>
        )}
      </motion.div>

      <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Ready to Battle?</h2>
      
      {chapterInfo && (
        <p className="text-primary text-sm font-medium mb-1">
          {chapterInfo.subject_name} • {chapterInfo.name}
        </p>
      )}
      
      <p className="text-muted-foreground text-sm mb-6">
        {questionCount} questions • Same questions • Same time
      </p>

      {/* VS Display - Mobile optimized */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6">
        {/* Challenger */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`glass-card rounded-xl p-3 sm:p-4 w-28 sm:w-36 ${
            challengerReady ? "border-2 border-green-500 shadow-[0_0_20px_hsl(142_71%_45%/0.2)]" : ""
          }`}
        >
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold ${
            challengerReady ? "bg-green-500/20 text-green-500" : "bg-secondary"
          }`}>
            {challengerReady ? <Check className="w-6 h-6" /> : challengerName.charAt(0).toUpperCase()}
          </div>
          <p className="font-semibold text-sm truncate">{isChallenger ? "You" : challengerName}</p>
          <p className={`text-xs ${challengerReady ? "text-green-500" : "text-muted-foreground"}`}>
            {challengerReady ? "Ready!" : "Waiting..."}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="text-xl sm:text-2xl font-bold text-primary"
        >
          VS
        </motion.div>

        {/* Opponent */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`glass-card rounded-xl p-3 sm:p-4 w-28 sm:w-36 ${
            opponentReady ? "border-2 border-green-500 shadow-[0_0_20px_hsl(142_71%_45%/0.2)]" : ""
          }`}
        >
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold ${
            opponentReady ? "bg-green-500/20 text-green-500" : "bg-secondary"
          }`}>
            {opponentReady ? <Check className="w-6 h-6" /> : opponentName ? opponentName.charAt(0).toUpperCase() : "?"}
          </div>
          <p className="font-semibold text-sm truncate">{!isChallenger ? "You" : (opponentName || "Opponent")}</p>
          <p className={`text-xs ${opponentReady ? "text-green-500" : "text-muted-foreground"}`}>
            {opponentReady ? "Ready!" : opponentName ? "Waiting..." : "Not joined"}
          </p>
        </motion.div>
      </div>

      {/* Rules - Compact for mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-4 mb-6 text-left"
      >
        <h4 className="font-semibold text-sm mb-2 text-center">⚡ Battle Rules</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Same questions, same order</li>
          <li>• Game starts when both ready</li>
          <li>• Winner by accuracy, then speed</li>
        </ul>
      </motion.div>

      {/* Actions */}
      {isStarting ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </motion.div>
          <p className="text-lg font-semibold text-primary">Starting Quiz...</p>
          <p className="text-muted-foreground text-xs">Get ready!</p>
        </motion.div>
      ) : opponentName ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {!myReady ? (
            <Button
              variant="neon"
              size="lg"
              className="h-12 px-8 text-base w-full max-w-xs"
              onClick={onReady}
              disabled={isSettingReady || isLeaving}
            >
              {isSettingReady ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Getting Ready...
                </>
              ) : (
                "I'm Ready!"
              )}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-green-500 font-medium text-sm">
              <Check className="w-4 h-4" />
              <span>Waiting for opponent...</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onLeaveDuel}
            disabled={isLeaving || isSettingReady}
          >
            {isLeaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-1" />
                Leave Duel
              </>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-muted-foreground text-sm">Share link with opponent:</p>
          <div className="glass-card rounded-xl p-3 flex items-center gap-2">
            <input
              readOnly
              value={`${window.location.origin}/challenge/${challengeId}`}
              className="flex-1 bg-transparent text-xs truncate outline-none font-mono min-w-0"
            />
            <Button variant="neon" size="sm" onClick={copyShareLink} className="shrink-0">
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onLeaveDuel}
            disabled={isLeaving}
          >
            {isLeaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Leaving...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-1" />
                Cancel Duel
              </>
            )}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
