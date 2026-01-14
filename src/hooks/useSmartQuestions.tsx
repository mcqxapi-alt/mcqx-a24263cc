import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuestionPublic } from "./useSecureQuestions";

/**
 * Hook for smart question management:
 * - Authenticated users: Get unseen questions, track progress
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
   * - For authenticated users: fetches unseen questions, generates AI if needed
   * - For guests: fetches random questions, generates AI if pool is small
   */
  const fetchSmartQuestions = useCallback(async (
    userId: string | null,
    chapterId: string,
    chapterName: string,
    subjectName: string,
    targetCount: number = 10
  ): Promise<{ questions: QuestionPublic[]; generatedCount: number }> => {
    let questions: QuestionPublic[] = [];
    let generatedCount = 0;

    if (userId) {
      // Authenticated user: fetch unseen questions
      questions = await fetchUnseenQuestionsForUser(userId, chapterId, targetCount + 10);
    } else {
      // Guest: fetch random questions
      questions = await fetchRandomQuestionsForGuest(chapterId, targetCount + 10);
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
          const aiQuestions = aiData.questions as QuestionPublic[];
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

    return { questions: shuffled, generatedCount };
  }, [fetchUnseenQuestionsForUser, fetchRandomQuestionsForGuest]);

  return {
    fetchUnseenQuestionsForUser,
    fetchRandomQuestionsForGuest,
    countUnseenQuestions,
    recordQuestionProgress,
    fetchSmartQuestions,
  };
}
