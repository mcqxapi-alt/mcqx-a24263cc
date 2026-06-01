-- Improved adaptive questions with top-up fallback when a difficulty bucket is short
CREATE OR REPLACE FUNCTION public.get_adaptive_questions(p_user_id uuid, p_chapter_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, chapter_id uuid, text text, option_a text, option_b text, option_c text, option_d text, source question_source, status question_status, difficulty question_difficulty, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_difficulty public.question_difficulty;
  v_easy_count INTEGER;
  v_medium_count INTEGER;
  v_hard_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT uds.current_difficulty INTO v_current_difficulty
  FROM user_difficulty_state uds
  WHERE uds.user_id = p_user_id AND uds.chapter_id = p_chapter_id;

  IF v_current_difficulty IS NULL THEN
    v_current_difficulty := 'medium';
  END IF;

  CASE v_current_difficulty
    WHEN 'easy' THEN
      v_easy_count := CEIL(p_limit * 0.6);
      v_medium_count := CEIL(p_limit * 0.3);
      v_hard_count := GREATEST(p_limit - v_easy_count - v_medium_count, 0);
    WHEN 'medium' THEN
      v_easy_count := CEIL(p_limit * 0.2);
      v_medium_count := CEIL(p_limit * 0.6);
      v_hard_count := GREATEST(p_limit - v_easy_count - v_medium_count, 0);
    WHEN 'hard' THEN
      v_easy_count := CEIL(p_limit * 0.1);
      v_medium_count := CEIL(p_limit * 0.3);
      v_hard_count := GREATEST(p_limit - v_easy_count - v_medium_count, 0);
  END CASE;

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
  primary_pick AS (
    SELECT * FROM easy_qs
    UNION ALL SELECT * FROM medium_qs
    UNION ALL SELECT * FROM hard_qs
  ),
  topup AS (
    -- Refill from any unseen question if primary buckets fell short
    SELECT u.*
    FROM unseen_questions u
    WHERE u.id NOT IN (SELECT id FROM primary_pick)
    ORDER BY random()
    LIMIT GREATEST(p_limit - (SELECT COUNT(*) FROM primary_pick), 0)
  ),
  combined AS (
    SELECT * FROM primary_pick
    UNION ALL
    SELECT * FROM topup
  )
  SELECT
    c.id, c.chapter_id, c.text, c.option_a, c.option_b, c.option_c, c.option_d,
    c.source, c.status, c.difficulty, c.created_at, c.updated_at
  FROM combined c
  ORDER BY random()
  LIMIT p_limit;
END;
$function$;