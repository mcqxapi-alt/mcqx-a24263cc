
-- Drop existing functions first (return type is changing)
DROP FUNCTION IF EXISTS public.get_unseen_questions_for_user(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.get_random_questions_for_guest(uuid, integer);
DROP FUNCTION IF EXISTS public.get_public_questions(uuid, integer);
DROP FUNCTION IF EXISTS public.get_questions_by_ids(uuid[]);
DROP FUNCTION IF EXISTS public.get_mixed_questions_for_power_user(uuid, uuid, integer, double precision, integer, integer);

-- Recreate with difficulty column included

CREATE OR REPLACE FUNCTION public.get_unseen_questions_for_user(p_user_id uuid, p_chapter_id uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, chapter_id uuid, text text, option_a text, option_b text, option_c text, option_d text, source question_source, status question_status, difficulty question_difficulty, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
        q.source, q.status, q.difficulty, q.created_at, q.updated_at
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id AND q.status = 'active'
      AND q.id NOT IN (
          SELECT uqp.question_id FROM public.user_question_progress uqp 
          WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_random_questions_for_guest(p_chapter_id uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, chapter_id uuid, text text, option_a text, option_b text, option_c text, option_d text, source question_source, status question_status, difficulty question_difficulty, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
        q.source, q.status, q.difficulty, q.created_at, q.updated_at
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id AND q.status = 'active'
    ORDER BY RANDOM()
    LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_questions(p_chapter_id uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, chapter_id uuid, text text, option_a text, option_b text, option_c text, option_d text, source question_source, status question_status, difficulty question_difficulty, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.difficulty, q.created_at, q.updated_at
  FROM public.questions q
  WHERE q.chapter_id = p_chapter_id AND q.status = 'active'
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.get_questions_by_ids(p_question_ids uuid[])
 RETURNS TABLE(id uuid, chapter_id uuid, text text, option_a text, option_b text, option_c text, option_d text, source question_source, status question_status, difficulty question_difficulty, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.difficulty, q.created_at, q.updated_at
  FROM public.questions q
  WHERE q.id = ANY(p_question_ids) AND q.status = 'active';
$function$;

CREATE OR REPLACE FUNCTION public.get_mixed_questions_for_power_user(p_user_id uuid, p_chapter_id uuid, p_limit integer DEFAULT 10, p_recycle_ratio double precision DEFAULT 0.3, p_min_days_ago integer DEFAULT 7, p_max_recycle_count integer DEFAULT 3)
 RETURNS TABLE(id uuid, chapter_id uuid, text text, option_a text, option_b text, option_c text, option_d text, source question_source, status question_status, difficulty question_difficulty, created_at timestamp with time zone, updated_at timestamp with time zone, is_recycled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_attempts INTEGER;
  v_recycle_count INTEGER;
  v_new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_attempts
  FROM public.user_question_progress uqp
  WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id;

  IF v_total_attempts < 100 THEN
    RETURN QUERY
    SELECT q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.difficulty, q.created_at, q.updated_at, FALSE as is_recycled
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id AND q.status = 'active'
      AND q.id NOT IN (
        SELECT uqp.question_id FROM public.user_question_progress uqp 
        WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
    RETURN;
  END IF;

  v_recycle_count := CEIL(p_limit * p_recycle_ratio)::INTEGER;
  v_new_count := p_limit - v_recycle_count;

  RETURN QUERY
  (
    SELECT q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.difficulty, q.created_at, q.updated_at, FALSE as is_recycled
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id AND q.status = 'active'
      AND q.id NOT IN (
        SELECT uqp.question_id FROM public.user_question_progress uqp 
        WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      )
    ORDER BY RANDOM()
    LIMIT v_new_count
  )
  UNION ALL
  (
    SELECT q.id, q.chapter_id, q.text, q.option_a, q.option_b, q.option_c, q.option_d,
      q.source, q.status, q.difficulty, q.created_at, q.updated_at, TRUE as is_recycled
    FROM public.questions q
    INNER JOIN public.user_question_progress uqp ON q.id = uqp.question_id
    WHERE q.chapter_id = p_chapter_id AND q.status = 'active'
      AND uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      AND uqp.recycle_count < p_max_recycle_count
      AND uqp.answered_at < NOW() - (p_min_days_ago || ' days')::INTERVAL
    ORDER BY uqp.was_correct ASC, uqp.answered_at ASC
    LIMIT v_recycle_count
  );
END;
$function$;
