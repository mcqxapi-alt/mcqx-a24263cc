import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QuestionPublic = {
  id: string;
  chapter_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  source: "verified" | "ai";
  status: string;
  created_at: string;
  updated_at: string;
};

export type AnswerValidation = {
  correct_answer: number;
  is_correct: boolean;
  explanation: string | null;
};

export type QuestionWithAnswer = QuestionPublic & {
  correct_answer?: number;
  explanation?: string | null;
};

/**
 * Hook for securely fetching questions and validating answers server-side.
 * Questions are fetched without correct_answer visible.
 * Answers are validated through a secure RPC function.
 */
export function useSecureQuestions() {
  const [validatedAnswers, setValidatedAnswers] = useState<Record<string, AnswerValidation>>({});
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Fetch questions for a chapter using secure RPC (no correct_answer exposed)
   */
  const fetchQuestionsForChapter = useCallback(async (
    chapterId: string,
    limit: number = 20
  ): Promise<QuestionPublic[]> => {
    const { data, error } = await supabase.rpc("get_public_questions", {
      p_chapter_id: chapterId,
      p_limit: limit,
    });

    if (error) {
      console.error("Error fetching questions:", error);
      throw error;
    }

    return (data || []) as QuestionPublic[];
  }, []);

  /**
   * Fetch questions by their IDs using secure RPC (for challenges)
   */
  const fetchQuestionsByIds = useCallback(async (
    questionIds: string[]
  ): Promise<QuestionPublic[]> => {
    const { data, error } = await supabase.rpc("get_questions_by_ids", {
      p_question_ids: questionIds,
    });

    if (error) {
      console.error("Error fetching questions by IDs:", error);
      throw error;
    }

    // Sort by the order of input IDs
    const questionsMap = new Map((data || []).map((q: any) => [q.id, q]));
    return questionIds
      .map(id => questionsMap.get(id))
      .filter(Boolean) as QuestionPublic[];
  }, []);

  /**
   * Validate a single answer server-side
   */
  const validateAnswer = useCallback(async (
    questionId: string,
    selectedAnswer: number
  ): Promise<AnswerValidation> => {
    // Check cache first
    if (validatedAnswers[questionId]) {
      return validatedAnswers[questionId];
    }

    setIsValidating(true);
    try {
      const { data, error } = await supabase.rpc("validate_answer", {
        p_question_id: questionId,
        p_selected_answer: selectedAnswer,
      });

      if (error) {
        console.error("Error validating answer:", error);
        throw error;
      }

      const result = data as AnswerValidation;
      
      // Cache the result
      setValidatedAnswers(prev => ({
        ...prev,
        [questionId]: result,
      }));

      return result;
    } finally {
      setIsValidating(false);
    }
  }, [validatedAnswers]);

  /**
   * Get answers for multiple questions at once (for results screen)
   */
  const getQuestionAnswers = useCallback(async (
    questionIds: string[]
  ): Promise<Record<string, { correct_answer: number; explanation: string | null }>> => {
    const { data, error } = await supabase.rpc("get_question_answers", {
      p_question_ids: questionIds,
    });

    if (error) {
      console.error("Error getting question answers:", error);
      throw error;
    }

    const result: Record<string, { correct_answer: number; explanation: string | null }> = {};
    if (data) {
      for (const item of data as { question_id: string; correct_answer: number; explanation: string | null }[]) {
        result[item.question_id] = {
          correct_answer: item.correct_answer,
          explanation: item.explanation,
        };
      }
    }

    return result;
  }, []);

  /**
   * Clear cached validations (for starting a new session)
   */
  const clearCache = useCallback(() => {
    setValidatedAnswers({});
  }, []);

  return {
    fetchQuestionsForChapter,
    fetchQuestionsByIds,
    validateAnswer,
    getQuestionAnswers,
    validatedAnswers,
    isValidating,
    clearCache,
  };
}
