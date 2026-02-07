import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type DifficultyStats = {
  currentDifficulty: DifficultyLevel;
  easyAccuracy: number;
  mediumAccuracy: number;
  hardAccuracy: number;
  totalAttempts: number;
};

export type QuestionWithDifficulty = {
  id: string;
  chapter_id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  source: "verified" | "ai";
  status: "active" | "flagged" | "retired";
  difficulty: DifficultyLevel;
  created_at: string;
  updated_at: string;
};

/**
 * Hook for adaptive difficulty management
 * - Tracks user performance per chapter
 * - Adjusts difficulty based on consecutive correct/incorrect answers
 * - Provides mixed difficulty question sets
 */
export function useAdaptiveDifficulty() {
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>("medium");

  /**
   * Fetch adaptive questions based on user's current difficulty level
   */
  const fetchAdaptiveQuestions = useCallback(async (
    userId: string,
    chapterId: string,
    limit: number = 10
  ): Promise<QuestionWithDifficulty[]> => {
    const { data, error } = await supabase.rpc("get_adaptive_questions", {
      p_user_id: userId,
      p_chapter_id: chapterId,
      p_limit: limit,
    });

    if (error) {
      console.error("Error fetching adaptive questions:", error);
      throw error;
    }

    return (data || []) as QuestionWithDifficulty[];
  }, []);

  /**
   * Update difficulty state after answering a question
   * Returns the new difficulty level
   */
  const updateDifficultyState = useCallback(async (
    userId: string,
    chapterId: string,
    questionDifficulty: DifficultyLevel,
    wasCorrect: boolean
  ): Promise<DifficultyLevel> => {
    const { data, error } = await supabase.rpc("update_difficulty_state", {
      p_user_id: userId,
      p_chapter_id: chapterId,
      p_question_difficulty: questionDifficulty,
      p_was_correct: wasCorrect,
    });

    if (error) {
      console.error("Error updating difficulty state:", error);
      return currentDifficulty;
    }

    const newDifficulty = data as DifficultyLevel;
    setCurrentDifficulty(newDifficulty);
    return newDifficulty;
  }, [currentDifficulty]);

  /**
   * Get user's difficulty stats for a chapter
   */
  const getDifficultyStats = useCallback(async (
    userId: string,
    chapterId: string
  ): Promise<DifficultyStats> => {
    const { data, error } = await supabase.rpc("get_user_difficulty_stats", {
      p_user_id: userId,
      p_chapter_id: chapterId,
    });

    if (error) {
      console.error("Error fetching difficulty stats:", error);
      return {
        currentDifficulty: "medium",
        easyAccuracy: 0,
        mediumAccuracy: 0,
        hardAccuracy: 0,
        totalAttempts: 0,
      };
    }

    const result = data?.[0];
    if (!result) {
      return {
        currentDifficulty: "medium",
        easyAccuracy: 0,
        mediumAccuracy: 0,
        hardAccuracy: 0,
        totalAttempts: 0,
      };
    }

    setCurrentDifficulty(result.current_difficulty as DifficultyLevel);
    
    return {
      currentDifficulty: result.current_difficulty as DifficultyLevel,
      easyAccuracy: Number(result.easy_accuracy) || 0,
      mediumAccuracy: Number(result.medium_accuracy) || 0,
      hardAccuracy: Number(result.hard_accuracy) || 0,
      totalAttempts: Number(result.total_attempts) || 0,
    };
  }, []);

  /**
   * Get difficulty label with emoji
   */
  const getDifficultyLabel = useCallback((difficulty: DifficultyLevel): string => {
    switch (difficulty) {
      case "easy":
        return "Easy";
      case "medium":
        return "Medium";
      case "hard":
        return "Hard";
      default:
        return "Medium";
    }
  }, []);

  /**
   * Get difficulty color classes
   */
  const getDifficultyColor = useCallback((difficulty: DifficultyLevel): string => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "hard":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  }, []);

  return {
    currentDifficulty,
    setCurrentDifficulty,
    fetchAdaptiveQuestions,
    updateDifficultyState,
    getDifficultyStats,
    getDifficultyLabel,
    getDifficultyColor,
  };
}
