-- Create difficulty enum
CREATE TYPE public.question_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Add difficulty column to questions table with default 'medium'
ALTER TABLE public.questions 
ADD COLUMN difficulty public.question_difficulty NOT NULL DEFAULT 'medium';

-- Create index for efficient filtering by difficulty
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);

-- Create composite index for chapter + difficulty queries
CREATE INDEX idx_questions_chapter_difficulty ON public.questions(chapter_id, difficulty);

-- Add user_difficulty_preference to track adaptive state per user per chapter
CREATE TABLE public.user_difficulty_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  current_difficulty public.question_difficulty NOT NULL DEFAULT 'medium',
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  consecutive_incorrect INTEGER NOT NULL DEFAULT 0,
  total_easy_correct INTEGER NOT NULL DEFAULT 0,
  total_easy_attempts INTEGER NOT NULL DEFAULT 0,
  total_medium_correct INTEGER NOT NULL DEFAULT 0,
  total_medium_attempts INTEGER NOT NULL DEFAULT 0,
  total_hard_correct INTEGER NOT NULL DEFAULT 0,
  total_hard_attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_chapter_difficulty UNIQUE (user_id, chapter_id)
);

-- Enable RLS on user_difficulty_state
ALTER TABLE public.user_difficulty_state ENABLE ROW LEVEL SECURITY;

-- Users can view their own difficulty state
CREATE POLICY "Users can view own difficulty state" 
ON public.user_difficulty_state 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own difficulty state
CREATE POLICY "Users can insert own difficulty state" 
ON public.user_difficulty_state 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own difficulty state
CREATE POLICY "Users can update own difficulty state" 
ON public.user_difficulty_state 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to get questions by difficulty with adaptive selection
CREATE OR REPLACE FUNCTION public.get_adaptive_questions(
  p_user_id UUID,
  p_chapter_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  chapter_id UUID,
  text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  source public.question_source,
  status public.question_status,
  difficulty public.question_difficulty,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_difficulty public.question_difficulty;
  v_easy_count INTEGER;
  v_medium_count INTEGER;
  v_hard_count INTEGER;
BEGIN
  -- Get user's current difficulty level for this chapter
  SELECT uds.current_difficulty INTO v_current_difficulty
  FROM user_difficulty_state uds
  WHERE uds.user_id = p_user_id AND uds.chapter_id = p_chapter_id;
  
  -- Default to medium if no state exists
  IF v_current_difficulty IS NULL THEN
    v_current_difficulty := 'medium';
  END IF;
  
  -- Calculate distribution based on current difficulty
  -- Primary difficulty gets 60%, adjacent gets 30%, other gets 10%
  CASE v_current_difficulty
    WHEN 'easy' THEN
      v_easy_count := CEIL(p_limit * 0.6);
      v_medium_count := CEIL(p_limit * 0.3);
      v_hard_count := p_limit - v_easy_count - v_medium_count;
    WHEN 'medium' THEN
      v_easy_count := CEIL(p_limit * 0.2);
      v_medium_count := CEIL(p_limit * 0.6);
      v_hard_count := p_limit - v_easy_count - v_medium_count;
    WHEN 'hard' THEN
      v_easy_count := CEIL(p_limit * 0.1);
      v_medium_count := CEIL(p_limit * 0.3);
      v_hard_count := p_limit - v_easy_count - v_medium_count;
  END CASE;
  
  -- Return questions prioritizing unseen ones, mixed by difficulty
  RETURN QUERY
  WITH unseen_questions AS (
    SELECT q.*
    FROM questions q
    WHERE q.chapter_id = p_chapter_id
      AND q.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_question_progress uqp
        WHERE uqp.question_id = q.id AND uqp.user_id = p_user_id
      )
  ),
  easy_qs AS (
    SELECT * FROM unseen_questions WHERE difficulty = 'easy' ORDER BY random() LIMIT v_easy_count
  ),
  medium_qs AS (
    SELECT * FROM unseen_questions WHERE difficulty = 'medium' ORDER BY random() LIMIT v_medium_count
  ),
  hard_qs AS (
    SELECT * FROM unseen_questions WHERE difficulty = 'hard' ORDER BY random() LIMIT v_hard_count
  ),
  combined AS (
    SELECT * FROM easy_qs
    UNION ALL
    SELECT * FROM medium_qs
    UNION ALL
    SELECT * FROM hard_qs
  )
  SELECT 
    combined.id,
    combined.chapter_id,
    combined.text,
    combined.option_a,
    combined.option_b,
    combined.option_c,
    combined.option_d,
    combined.source,
    combined.status,
    combined.difficulty,
    combined.created_at,
    combined.updated_at
  FROM combined
  ORDER BY random()
  LIMIT p_limit;
END;
$$;

-- Function to update user difficulty state after answering
CREATE OR REPLACE FUNCTION public.update_difficulty_state(
  p_user_id UUID,
  p_chapter_id UUID,
  p_question_difficulty public.question_difficulty,
  p_was_correct BOOLEAN
)
RETURNS public.question_difficulty
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state user_difficulty_state%ROWTYPE;
  v_new_difficulty public.question_difficulty;
BEGIN
  -- Get or create state
  SELECT * INTO v_state
  FROM user_difficulty_state
  WHERE user_id = p_user_id AND chapter_id = p_chapter_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_difficulty_state (user_id, chapter_id, current_difficulty)
    VALUES (p_user_id, p_chapter_id, 'medium')
    RETURNING * INTO v_state;
  END IF;
  
  -- Update attempt counters
  CASE p_question_difficulty
    WHEN 'easy' THEN
      v_state.total_easy_attempts := v_state.total_easy_attempts + 1;
      IF p_was_correct THEN
        v_state.total_easy_correct := v_state.total_easy_correct + 1;
      END IF;
    WHEN 'medium' THEN
      v_state.total_medium_attempts := v_state.total_medium_attempts + 1;
      IF p_was_correct THEN
        v_state.total_medium_correct := v_state.total_medium_correct + 1;
      END IF;
    WHEN 'hard' THEN
      v_state.total_hard_attempts := v_state.total_hard_attempts + 1;
      IF p_was_correct THEN
        v_state.total_hard_correct := v_state.total_hard_correct + 1;
      END IF;
  END CASE;
  
  -- Update consecutive counters
  IF p_was_correct THEN
    v_state.consecutive_correct := v_state.consecutive_correct + 1;
    v_state.consecutive_incorrect := 0;
  ELSE
    v_state.consecutive_incorrect := v_state.consecutive_incorrect + 1;
    v_state.consecutive_correct := 0;
  END IF;
  
  -- Adaptive difficulty logic
  v_new_difficulty := v_state.current_difficulty;
  
  -- Move UP if 3+ consecutive correct at current level
  IF v_state.consecutive_correct >= 3 THEN
    CASE v_state.current_difficulty
      WHEN 'easy' THEN v_new_difficulty := 'medium';
      WHEN 'medium' THEN v_new_difficulty := 'hard';
      WHEN 'hard' THEN v_new_difficulty := 'hard'; -- Stay at hard
    END CASE;
    v_state.consecutive_correct := 0; -- Reset after level change
  END IF;
  
  -- Move DOWN if 2+ consecutive incorrect at current level
  IF v_state.consecutive_incorrect >= 2 THEN
    CASE v_state.current_difficulty
      WHEN 'hard' THEN v_new_difficulty := 'medium';
      WHEN 'medium' THEN v_new_difficulty := 'easy';
      WHEN 'easy' THEN v_new_difficulty := 'easy'; -- Stay at easy
    END CASE;
    v_state.consecutive_incorrect := 0; -- Reset after level change
  END IF;
  
  v_state.current_difficulty := v_new_difficulty;
  v_state.updated_at := now();
  
  -- Save updated state
  UPDATE user_difficulty_state
  SET 
    current_difficulty = v_state.current_difficulty,
    consecutive_correct = v_state.consecutive_correct,
    consecutive_incorrect = v_state.consecutive_incorrect,
    total_easy_correct = v_state.total_easy_correct,
    total_easy_attempts = v_state.total_easy_attempts,
    total_medium_correct = v_state.total_medium_correct,
    total_medium_attempts = v_state.total_medium_attempts,
    total_hard_correct = v_state.total_hard_correct,
    total_hard_attempts = v_state.total_hard_attempts,
    updated_at = v_state.updated_at
  WHERE user_id = p_user_id AND chapter_id = p_chapter_id;
  
  RETURN v_new_difficulty;
END;
$$;

-- Function to get user's difficulty stats for a chapter
CREATE OR REPLACE FUNCTION public.get_user_difficulty_stats(
  p_user_id UUID,
  p_chapter_id UUID
)
RETURNS TABLE (
  current_difficulty public.question_difficulty,
  easy_accuracy NUMERIC,
  medium_accuracy NUMERIC,
  hard_accuracy NUMERIC,
  total_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uds.current_difficulty, 'medium'::public.question_difficulty) as current_difficulty,
    CASE WHEN uds.total_easy_attempts > 0 
      THEN ROUND((uds.total_easy_correct::NUMERIC / uds.total_easy_attempts) * 100, 1)
      ELSE 0 
    END as easy_accuracy,
    CASE WHEN uds.total_medium_attempts > 0 
      THEN ROUND((uds.total_medium_correct::NUMERIC / uds.total_medium_attempts) * 100, 1)
      ELSE 0 
    END as medium_accuracy,
    CASE WHEN uds.total_hard_attempts > 0 
      THEN ROUND((uds.total_hard_correct::NUMERIC / uds.total_hard_attempts) * 100, 1)
      ELSE 0 
    END as hard_accuracy,
    COALESCE(uds.total_easy_attempts + uds.total_medium_attempts + uds.total_hard_attempts, 0) as total_attempts
  FROM user_difficulty_state uds
  WHERE uds.user_id = p_user_id AND uds.chapter_id = p_chapter_id;
  
  -- Return defaults if no state exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'medium'::public.question_difficulty,
      0::NUMERIC,
      0::NUMERIC,
      0::NUMERIC,
      0::INTEGER;
  END IF;
END;
$$;