import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  onOpponentJoined?: () => void;
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

  // Subscribe to challenge updates
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
          onChallengeUpdate?.(newData);

          // Check if opponent just joined
          if (payload.old && !(payload.old as any).opponent_id && newData.opponent_id) {
            console.log("[Realtime] Opponent joined!");
            onOpponentJoined?.();
          }

          // Check if both are now ready
          if (
            newData.challenger_ready &&
            newData.opponent_ready &&
            newData.started_at &&
            (!(payload.old as any)?.challenger_ready || !(payload.old as any)?.opponent_ready)
          ) {
            console.log("[Realtime] Both ready, starting at:", newData.started_at);
            onBothReady?.(newData.started_at);
          }

          // Check if opponent just finished
          if (userId) {
            const isChallenger = newData.challenger_id === userId;
            const opponentFinishedField = isChallenger ? "opponent_finished_at" : "challenger_finished_at";
            if (
              newData[opponentFinishedField] &&
              !(payload.old as any)?.[opponentFinishedField]
            ) {
              console.log("[Realtime] Opponent finished!");
              onOpponentFinished?.();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      console.log("[Realtime] Unsubscribing from challenge:", challengeId);
      channel.unsubscribe();
    };
  }, [challengeId, userId, onChallengeUpdate, onOpponentJoined, onBothReady, onOpponentFinished]);

  // Subscribe to progress updates
  useEffect(() => {
    if (!challengeId || !userId) return;

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
          // Only notify about opponent's progress
          if (progressData && progressData.user_id !== userId) {
            onOpponentProgress?.(progressData);
          }
        }
      )
      .subscribe();

    progressChannelRef.current = progressChannel;

    return () => {
      progressChannel.unsubscribe();
    };
  }, [challengeId, userId, onOpponentProgress]);

  // Update own progress
  const updateProgress = useCallback(
    async (currentQuestion: number) => {
      if (!challengeId || !userId) return;

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
    },
    [challengeId, userId]
  );

  // Set ready status
  const setReady = useCallback(
    async (isChallenger: boolean) => {
      if (!challengeId) return;

      const updateField = isChallenger ? "challenger_ready" : "opponent_ready";

      // First update ready status
      await supabase
        .from("challenges")
        .update({ [updateField]: true })
        .eq("id", challengeId);

      // Check if both are ready now
      const { data } = await supabase
        .from("challenges")
        .select("challenger_ready, opponent_ready")
        .eq("id", challengeId)
        .single();

      if (data?.challenger_ready && data?.opponent_ready) {
        // Set start time (4 seconds from now for countdown)
        const startTime = new Date(Date.now() + 4000).toISOString();
        await supabase
          .from("challenges")
          .update({
            started_at: startTime,
            status: "playing",
          })
          .eq("id", challengeId);
      }
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

  return {
    updateProgress,
    setReady,
    recordAnswer,
    finishChallenge,
  };
}
