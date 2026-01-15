-- Add recycle_count column to track how many times a question has been recycled
ALTER TABLE public.user_question_progress 
ADD COLUMN IF NOT EXISTS recycle_count INTEGER NOT NULL DEFAULT 0;

-- Create function to get mixed questions for power users (100+ attempts)
CREATE OR REPLACE FUNCTION public.get_mixed_questions_for_power_user(
  p_user_id UUID,
  p_chapter_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_recycle_ratio FLOAT DEFAULT 0.3,
  p_min_days_ago INTEGER DEFAULT 7,
  p_max_recycle_count INTEGER DEFAULT 3
)
RETURNS TABLE(
  id UUID,
  chapter_id UUID,
  text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  source question_source,
  status question_status,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_recycled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_attempts INTEGER;
  v_recycle_count INTEGER;
  v_new_count INTEGER;
BEGIN
  -- Count user's total attempts in this chapter
  SELECT COUNT(*) INTO v_total_attempts
  FROM public.user_question_progress uqp
  WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id;

  -- If user hasn't reached power user threshold, return only unseen questions
  IF v_total_attempts < 100 THEN
    RETURN QUERY
    SELECT 
      q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.created_at, q.updated_at,
      FALSE as is_recycled
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id 
      AND q.status = 'active'
      AND q.id NOT IN (
        SELECT uqp.question_id 
        FROM public.user_question_progress uqp 
        WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Power user: calculate mix ratio
  v_recycle_count := CEIL(p_limit * p_recycle_ratio)::INTEGER;
  v_new_count := p_limit - v_recycle_count;

  -- Return mix of new and recycled questions
  RETURN QUERY
  (
    -- First: Get unseen questions
    SELECT 
      q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.created_at, q.updated_at,
      FALSE as is_recycled
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id 
      AND q.status = 'active'
      AND q.id NOT IN (
        SELECT uqp.question_id 
        FROM public.user_question_progress uqp 
        WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      )
    ORDER BY RANDOM()
    LIMIT v_new_count
  )
  UNION ALL
  (
    -- Second: Get recycled questions (prioritize incorrect, then old correct)
    SELECT 
      q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.created_at, q.updated_at,
      TRUE as is_recycled
    FROM public.questions q
    INNER JOIN public.user_question_progress uqp ON q.id = uqp.question_id
    WHERE q.chapter_id = p_chapter_id 
      AND q.status = 'active'
      AND uqp.user_id = p_user_id
      AND uqp.chapter_id = p_chapter_id
      AND uqp.recycle_count < p_max_recycle_count
      AND uqp.answered_at < NOW() - (p_min_days_ago || ' days')::INTERVAL
    ORDER BY 
      uqp.was_correct ASC,  -- Incorrect first (false = 0, true = 1)
      uqp.answered_at ASC   -- Older questions first
    LIMIT v_recycle_count
  );
END;
$$;

-- Create function to increment recycle count when a recycled question is answered
CREATE OR REPLACE FUNCTION public.increment_recycle_count(
  p_user_id UUID,
  p_question_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_question_progress
  SET recycle_count = recycle_count + 1
  WHERE user_id = p_user_id AND question_id = p_question_id;
END;
$$;

-- Create function to count user attempts in a chapter
CREATE OR REPLACE FUNCTION public.count_user_chapter_attempts(
  p_user_id UUID,
  p_chapter_id UUID
)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_question_progress
  WHERE user_id = p_user_id AND chapter_id = p_chapter_id;
$$;