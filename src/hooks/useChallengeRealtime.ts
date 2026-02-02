import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export type ChallengeStatus = "open" | "lobby" | "playing" | "finished" | "closed";

export type RealtimeChallenge = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  chapter_id: string;
  question_ids: string[];
  challenger_score: number | null;
  opponent_score: number | null;
  status: ChallengeStatus;
  created_at: string;
  completed_at: string | null;
  challenger_ready: boolean;
  opponent_ready: boolean;
  started_at: string | null;
  challenger_finished_at: string | null;
  opponent_finished_at: string | null;
  challenger_answers: any[];
  opponent_answers: any[];
  challenger_time_ms: number | null;
  opponent_time_ms: number | null;
};

export type ChallengeProgress = {
  challenge_id: string;
  user_id: string;
  current_question: number;
};

type UseChallengeRealtimeOptions = {
  challengeId: string | null;
  userId: string | null;
  onChallengeUpdate?: (challenge: RealtimeChallenge) => void;
  onOpponentProgress?: (progress: ChallengeProgress) => void;
  onOpponentJoined?: (opponentId: string) => void;
  onBothReady?: (startedAt: string) => void;
  onOpponentFinished?: () => void;
};

export function useChallengeRealtime({
  challengeId,
  userId,
  onChallengeUpdate,
  onOpponentProgress,
  onOpponentJoined,
  onBothReady,
  onOpponentFinished,
}: UseChallengeRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const progressChannelRef = useRef<RealtimeChannel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  // Stabilize callbacks in refs to prevent re-subscriptions
  const onChallengeUpdateRef = useRef(onChallengeUpdate);
  const onOpponentProgressRef = useRef(onOpponentProgress);
  const onOpponentJoinedRef = useRef(onOpponentJoined);
  const onBothReadyRef = useRef(onBothReady);
  const onOpponentFinishedRef = useRef(onOpponentFinished);
  const userIdRef = useRef(userId);

  // Update refs on every render (but don't trigger re-subscription)
  useEffect(() => {
    onChallengeUpdateRef.current = onChallengeUpdate;
    onOpponentProgressRef.current = onOpponentProgress;
    onOpponentJoinedRef.current = onOpponentJoined;
    onBothReadyRef.current = onBothReady;
    onOpponentFinishedRef.current = onOpponentFinished;
    userIdRef.current = userId;
  });

  // Subscribe to challenge updates - only depends on challengeId
  useEffect(() => {
    if (!challengeId) return;

    console.log("[Realtime] Subscribing to challenge:", challengeId);

    const channel = supabase
      .channel(`challenge:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "challenges",
          filter: `id=eq.${challengeId}`,
        },
        (payload) => {
          console.log("[Realtime] Challenge update received:", payload.new);
          const newData = payload.new as RealtimeChallenge;
          onChallengeUpdateRef.current?.(newData);

          // Check if opponent just joined - pass the new opponent_id
          if (payload.old && !(payload.old as any).opponent_id && newData.opponent_id) {
            console.log("[Realtime] Opponent joined!", newData.opponent_id);
            onOpponentJoinedRef.current?.(newData.opponent_id);
          }

          // Check if the match is scheduled to start (server sets started_at when both are ready)
          const startedAtJustSet = !!newData.started_at && !(payload.old as any)?.started_at;
          if (newData.challenger_ready && newData.opponent_ready && newData.started_at && startedAtJustSet) {
            console.log("[Realtime] Both ready, starting at:", newData.started_at);
            onBothReadyRef.current?.(newData.started_at);
          }

          // Check if opponent just finished
          const currentUserId = userIdRef.current;
          if (currentUserId) {
            const isChallenger = newData.challenger_id === currentUserId;
            const opponentFinishedField = isChallenger ? "opponent_finished_at" : "challenger_finished_at";
            if (
              newData[opponentFinishedField] &&
              !(payload.old as any)?.[opponentFinishedField]
            ) {
              console.log("[Realtime] Opponent finished!");
              onOpponentFinishedRef.current?.();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "TIMED_OUT" || status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
        }
      });

    channelRef.current = channel;

    return () => {
      console.log("[Realtime] Unsubscribing from challenge:", challengeId);
      channel.unsubscribe();
    };
  }, [challengeId]); // Only depend on challengeId - callbacks are in refs

  // Subscribe to progress updates - only depends on challengeId
  useEffect(() => {
    if (!challengeId) return;

    const progressChannel = supabase
      .channel(`challenge-progress:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_progress",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          const progressData = (payload.new || payload.old) as ChallengeProgress;
          const currentUserId = userIdRef.current;
          // Only notify about opponent's progress
          if (progressData && currentUserId && progressData.user_id !== currentUserId) {
            onOpponentProgressRef.current?.(progressData);
          }
        }
      )
      .subscribe();

    progressChannelRef.current = progressChannel;

    return () => {
      progressChannel.unsubscribe();
    };
  }, [challengeId]); // Only depend on challengeId

  // Debounced progress update to reduce network overhead
  const progressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<number>(-1);

  const updateProgress = useCallback(
    (currentQuestion: number) => {
      if (!challengeId || !userId) return;

      // Skip if same progress
      if (lastProgressRef.current === currentQuestion) return;
      lastProgressRef.current = currentQuestion;

      // Clear pending update
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }

      // Debounce - send after 150ms of no changes (fast enough to feel responsive)
      progressTimeoutRef.current = setTimeout(async () => {
        await supabase
          .from("challenge_progress")
          .upsert(
            {
              challenge_id: challengeId,
              user_id: userId,
              current_question: currentQuestion,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "challenge_id,user_id" }
          );
      }, 150);
    },
    [challengeId, userId]
  );

  // Set ready status
  const setReady = useCallback(
    async (isChallenger: boolean): Promise<string | null> => {
      if (!challengeId) return null;

      const updateField = isChallenger ? "challenger_ready" : "opponent_ready";

      // First update ready status
      await supabase
        .from("challenges")
        .update({ [updateField]: true })
        .eq("id", challengeId);

      // Check if both are ready now
      const { data } = await supabase
        .from("challenges")
        .select("challenger_ready, opponent_ready, started_at")
        .eq("id", challengeId)
        .single();

      // If started_at is already set by the other player, return it
      if (data?.started_at) {
        console.log("[Realtime] Game already starting at:", data.started_at);
        return data.started_at;
      }

      if (data?.challenger_ready && data?.opponent_ready) {
        // Set start time (4 seconds from now for countdown)
        const startTime = new Date(Date.now() + 4000).toISOString();

        // IMPORTANT: Prevent both clients from overwriting started_at.
        // Use `.is(column, null)` (not `.eq(column, null)`) to reliably filter NULL.
        const { data: updated, error } = await supabase
          .from("challenges")
          .update({
            started_at: startTime,
            status: "playing",
          })
          .eq("id", challengeId)
          .is("started_at", null)
          .select("started_at");

        if (!error && updated && updated.length > 0 && (updated[0] as any)?.started_at) {
          const startedAt = (updated[0] as any).started_at as string;
          console.log("[Realtime] Set start time to:", startedAt);
          return startedAt;
        }

        // Another client likely set it first (or the update didn't match). Fetch the actual started_at.
        const { data: refreshed } = await supabase
          .from("challenges")
          .select("started_at")
          .eq("id", challengeId)
          .single();

        return refreshed?.started_at || null;
      }

      return null;
    },
    [challengeId]
  );

  // Record answer
  const recordAnswer = useCallback(
    async (
      isChallenger: boolean,
      questionIndex: number,
      selectedAnswer: number,
      timeTakenMs: number,
      isCorrect: boolean
    ) => {
      if (!challengeId) return;

      const answersField = isChallenger ? "challenger_answers" : "opponent_answers";

      // Get current answers
      const { data: current } = await supabase
        .from("challenges")
        .select(answersField)
        .eq("id", challengeId)
        .single();

      const currentAnswers = (current?.[answersField] as any[]) || [];
      const newAnswers = [
        ...currentAnswers,
        {
          question_index: questionIndex,
          selected_answer: selectedAnswer,
          time_taken_ms: timeTakenMs,
          is_correct: isCorrect,
        },
      ];

      await supabase
        .from("challenges")
        .update({ [answersField]: newAnswers })
        .eq("id", challengeId);
    },
    [challengeId]
  );

  // Finish challenge
  const finishChallenge = useCallback(
    async (isChallenger: boolean, score: number, totalTimeMs: number) => {
      if (!challengeId) return;

      const finishedAtField = isChallenger ? "challenger_finished_at" : "opponent_finished_at";
      const scoreField = isChallenger ? "challenger_score" : "opponent_score";
      const timeField = isChallenger ? "challenger_time_ms" : "opponent_time_ms";

      // Update own finish time and score
      await supabase
        .from("challenges")
        .update({
          [finishedAtField]: new Date().toISOString(),
          [scoreField]: score,
          [timeField]: totalTimeMs,
        })
        .eq("id", challengeId);

      // Check if both finished
      const { data } = await supabase
        .from("challenges")
        .select("challenger_finished_at, opponent_finished_at")
        .eq("id", challengeId)
        .single();

      if (data?.challenger_finished_at && data?.opponent_finished_at) {
        await supabase
          .from("challenges")
          .update({
            status: "finished",
            completed_at: new Date().toISOString(),
          })
          .eq("id", challengeId);
      }
    },
    [challengeId]
  );

  // Leave duel - cancel ready state and optionally close challenge
  const leaveDuel = useCallback(
    async (isChallenger: boolean) => {
      if (!challengeId) return;

      if (isChallenger) {
        // Challenger leaving closes the challenge
        await supabase
          .from("challenges")
          .update({
            status: "closed",
            challenger_ready: false,
          })
          .eq("id", challengeId);
      } else {
        // Opponent leaving removes them and resets challenge to open
        await supabase
          .from("challenges")
          .update({
            opponent_id: null,
            opponent_ready: false,
            status: "open",
          })
          .eq("id", challengeId);
      }

      // Cleanup progress record
      if (userId) {
        await supabase
          .from("challenge_progress")
          .delete()
          .eq("challenge_id", challengeId)
          .eq("user_id", userId);
      }
    },
    [challengeId, userId]
  );

  return {
    connectionStatus,
    updateProgress,
    setReady,
    recordAnswer,
    finishChallenge,
    leaveDuel,
  };
}
