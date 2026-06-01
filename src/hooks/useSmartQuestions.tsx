import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuestionPublic } from "./useSecureQuestions";

// Power user threshold - users with 100+ attempts get mixed questions
const POWER_USER_THRESHOLD = 100;

// Extended type that includes recycled flag
export type QuestionWithRecycled = QuestionPublic & {
  is_recycled?: boolean;
};

/**
 * Hook for smart question management:
 * - Authenticated users: Get unseen questions, track progress
 * - Power users (100+ attempts): Get mixed questions (70% new, 30% recycled)
 * - Guests: Get random questions without tracking
 * - Generates AI questions only when pool is exhausted
 */
export function useSmartQuestions() {
  /**
   * Fetch unseen questions for authenticated users
   */
  const fetchUnseenQuestionsForUser = useCallback(async (
    userId: string,
    chapterId: string,
    limit: number = 20
  ): Promise<QuestionPublic[]> => {
    const { data, error } = await supabase.rpc("get_unseen_questions_for_user", {
      p_user_id: userId,
      p_chapter_id: chapterId,
      p_limit: limit,
    });

    if (error) {
      console.error("Error fetching unseen questions:", error);
      throw error;
    }

    return (data || []) as QuestionPublic[];
  }, []);

  /**
   * Fetch mixed questions for power users (100+ attempts in chapter)
   * Returns 70% new questions, 30% recycled (prioritizing incorrect ones)
   */
  const fetchMixedQuestionsForPowerUser = useCallback(async (
    userId: string,
    chapterId: string,
    limit: number = 10
  ): Promise<QuestionWithRecycled[]> => {
    const { data, error } = await supabase.rpc("get_mixed_questions_for_power_user", {
      p_user_id: userId,
      p_chapter_id: chapterId,
      p_limit: limit,
      p_recycle_ratio: 0.3,
      p_min_days_ago: 7,
      p_max_recycle_count: 3,
    });

    if (error) {
      console.error("Error fetching mixed questions:", error);
      throw error;
    }

    return (data || []) as QuestionWithRecycled[];
  }, []);

  /**
   * Count user's total attempts in a chapter
   */
  const countUserChapterAttempts = useCallback(async (
    userId: string,
    chapterId: string
  ): Promise<number> => {
    const { data, error } = await supabase.rpc("count_user_chapter_attempts", {
      p_user_id: userId,
      p_chapter_id: chapterId,
    });

    if (error) {
      console.error("Error counting user attempts:", error);
      return 0;
    }

    return data as number;
  }, []);

  /**
   * Increment recycle count when a recycled question is answered
   */
  const incrementRecycleCount = useCallback(async (
    userId: string,
    questionId: string
  ): Promise<void> => {
    const { error } = await supabase.rpc("increment_recycle_count", {
      p_user_id: userId,
      p_question_id: questionId,
    });

    if (error) {
      console.error("Error incrementing recycle count:", error);
    }
  }, []);

  /**
   * Fetch random questions for guests (no tracking)
   */
  const fetchRandomQuestionsForGuest = useCallback(async (
    chapterId: string,
    limit: number = 20
  ): Promise<QuestionPublic[]> => {
    const { data, error } = await supabase.rpc("get_random_questions_for_guest", {
      p_chapter_id: chapterId,
      p_limit: limit,
    });

    if (error) {
      console.error("Error fetching random questions:", error);
      throw error;
    }

    return (data || []) as QuestionPublic[];
  }, []);

  /**
   * Count remaining unseen questions for a user
   */
  const countUnseenQuestions = useCallback(async (
    userId: string,
    chapterId: string
  ): Promise<number> => {
    const { data, error } = await supabase.rpc("count_unseen_questions", {
      p_user_id: userId,
      p_chapter_id: chapterId,
    });

    if (error) {
      console.error("Error counting unseen questions:", error);
      throw error;
    }

    return data as number;
  }, []);

  /**
   * Record that a user answered a question (for progress tracking)
   */
  const recordQuestionProgress = useCallback(async (
    userId: string,
    questionId: string,
    chapterId: string,
    wasCorrect: boolean
  ): Promise<void> => {
    const { error } = await supabase.rpc("record_question_progress", {
      p_user_id: userId,
      p_question_id: questionId,
      p_chapter_id: chapterId,
      p_was_correct: wasCorrect,
    });

    if (error) {
      console.error("Error recording question progress:", error);
      // Don't throw - this is non-critical
    }
  }, []);

  /**
   * Smart question fetching with AI fallback
   * - For power users (100+ attempts): mixed questions with recycling
   * - For regular authenticated users: fetches unseen questions, generates AI if needed
   * - For guests: fetches random questions, generates AI if pool is small
   */
  const fetchSmartQuestions = useCallback(async (
    userId: string | null,
    chapterId: string,
    chapterName: string,
    subjectName: string,
    targetCount: number = 10
  ): Promise<{ questions: QuestionWithRecycled[]; generatedCount: number; isPowerUser: boolean }> => {
    let questions: QuestionWithRecycled[] = [];
    let generatedCount = 0;
    let isPowerUser = false;

    if (userId) {
      // Check if user is a power user (100+ attempts in this chapter)
      const attemptCount = await countUserChapterAttempts(userId, chapterId);
      isPowerUser = attemptCount >= POWER_USER_THRESHOLD;

      if (isPowerUser) {
        // Power user: get mixed questions (70% new, 30% recycled)
        questions = await fetchMixedQuestionsForPowerUser(userId, chapterId, targetCount + 10);
      } else {
        // Regular authenticated user: try adaptive selection first (difficulty-weighted by user level)
        try {
          const { data: adaptive, error: adaptiveError } = await supabase.rpc("get_adaptive_questions", {
            p_user_id: userId,
            p_chapter_id: chapterId,
            p_limit: targetCount + 5,
          });
          if (!adaptiveError && adaptive && (adaptive as any[]).length > 0) {
            questions = (adaptive as QuestionPublic[]).map(q => ({ ...q, is_recycled: false }));
          }
        } catch (e) {
          console.warn("Adaptive fetch failed, falling back to unseen:", e);
        }

        // Fallback / top-up with plain unseen pool if adaptive came up short
        if (questions.length < targetCount) {
          const unseenQuestions = await fetchUnseenQuestionsForUser(userId, chapterId, targetCount + 10);
          const existing = new Set(questions.map(q => q.id));
          const extra = unseenQuestions.filter(q => !existing.has(q.id)).map(q => ({ ...q, is_recycled: false }));
          questions = [...questions, ...extra];
        }
      }
    } else {
      // Guest: fetch random questions
      const randomQuestions = await fetchRandomQuestionsForGuest(chapterId, targetCount + 10);
      questions = randomQuestions.map(q => ({ ...q, is_recycled: false }));
    }

    // If we don't have enough questions, generate AI ones
    if (questions.length < targetCount) {
      try {
        const neededCount = targetCount - questions.length;
        const { data: aiData, error: aiError } = await supabase.functions.invoke(
          "generate-mcqs",
          {
            body: {
              chapterId,
              chapterName,
              subjectName,
              count: neededCount,
            },
          }
        );

        if (aiError) {
          console.error("Error generating AI questions:", aiError);
        } else if (aiData?.questions && Array.isArray(aiData.questions)) {
          const aiQuestions = aiData.questions.map((q: QuestionPublic) => ({ ...q, is_recycled: false })) as QuestionWithRecycled[];
          generatedCount = aiQuestions.length;
          
          // For authenticated users, filter out any AI questions they've already seen
          if (userId) {
            const existingIds = new Set(questions.map(q => q.id));
            const newAiQuestions = aiQuestions.filter(q => !existingIds.has(q.id));
            questions = [...questions, ...newAiQuestions];
          } else {
            questions = [...questions, ...aiQuestions];
          }
        }
      } catch (err) {
        console.error("Failed to generate AI questions:", err);
      }
    }

    // Shuffle and limit to target count
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, targetCount);

    return { questions: shuffled, generatedCount, isPowerUser };
  }, [fetchUnseenQuestionsForUser, fetchRandomQuestionsForGuest, fetchMixedQuestionsForPowerUser, countUserChapterAttempts]);

  return {
    fetchUnseenQuestionsForUser,
    fetchRandomQuestionsForGuest,
    fetchMixedQuestionsForPowerUser,
    countUnseenQuestions,
    countUserChapterAttempts,
    recordQuestionProgress,
    incrementRecycleCount,
    fetchSmartQuestions,
  };
}
