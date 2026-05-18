
-- 1. Challenges: split join from update. Restrict UPDATE to participants only.
DROP POLICY IF EXISTS "Users can update challenges they're part of or join open ones" ON public.challenges;

CREATE POLICY "Participants can update their challenges"
ON public.challenges FOR UPDATE
USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)
WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE OR REPLACE FUNCTION public.join_open_challenge(p_challenge_id uuid)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.challenges;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.challenges
  SET opponent_id = auth.uid(),
      status = 'lobby'
  WHERE id = p_challenge_id
    AND status = 'open'
    AND opponent_id IS NULL
    AND challenger_id <> auth.uid()
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Challenge not joinable';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_open_challenge(uuid) TO authenticated;

-- 2. Questions: remove over-permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON public.questions;

-- 3. Profiles: allow authenticated users to view (app only selects display_name / avatar_url)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4. Lock down validate_answer / get_question_answers to authenticated users only
CREATE OR REPLACE FUNCTION public.validate_answer(p_question_id uuid, p_selected_answer integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_answer integer;
  v_explanation text;
  v_is_correct boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT correct_answer, explanation
  INTO v_correct_answer, v_explanation
  FROM public.questions
  WHERE id = p_question_id AND status = 'active';

  IF v_correct_answer IS NULL THEN
    RETURN jsonb_build_object('error', 'Question not found');
  END IF;

  v_is_correct := (p_selected_answer = v_correct_answer);

  RETURN jsonb_build_object(
    'correct_answer', v_correct_answer,
    'is_correct', v_is_correct,
    'explanation', v_explanation
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_answer(uuid, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.validate_answer(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_question_answers(p_question_ids uuid[])
RETURNS TABLE(question_id uuid, correct_answer integer, explanation text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT q.id, q.correct_answer, q.explanation
  FROM public.questions q
  WHERE q.id = ANY(p_question_ids) AND q.status = 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_question_answers(uuid[]) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_question_answers(uuid[]) TO authenticated;

-- 5. User-scoped RPCs: enforce p_user_id = auth.uid()
CREATE OR REPLACE FUNCTION public.record_question_progress(p_user_id uuid, p_question_id uuid, p_chapter_id uuid, p_was_correct boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.user_question_progress (user_id, question_id, chapter_id, was_correct)
  VALUES (p_user_id, p_question_id, p_chapter_id, p_was_correct)
  ON CONFLICT (user_id, question_id) DO UPDATE SET
    was_correct = p_was_correct,
    answered_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_difficulty_state(p_user_id uuid, p_chapter_id uuid, p_question_difficulty question_difficulty, p_was_correct boolean)
RETURNS question_difficulty
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state user_difficulty_state%ROWTYPE;
  v_new_difficulty public.question_difficulty;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO v_state
  FROM user_difficulty_state
  WHERE user_id = p_user_id AND chapter_id = p_chapter_id;

  IF NOT FOUND THEN
    INSERT INTO user_difficulty_state (user_id, chapter_id, current_difficulty)
    VALUES (p_user_id, p_chapter_id, 'medium')
    RETURNING * INTO v_state;
  END IF;

  CASE p_question_difficulty
    WHEN 'easy' THEN
      v_state.total_easy_attempts := v_state.total_easy_attempts + 1;
      IF p_was_correct THEN v_state.total_easy_correct := v_state.total_easy_correct + 1; END IF;
    WHEN 'medium' THEN
      v_state.total_medium_attempts := v_state.total_medium_attempts + 1;
      IF p_was_correct THEN v_state.total_medium_correct := v_state.total_medium_correct + 1; END IF;
    WHEN 'hard' THEN
      v_state.total_hard_attempts := v_state.total_hard_attempts + 1;
      IF p_was_correct THEN v_state.total_hard_correct := v_state.total_hard_correct + 1; END IF;
  END CASE;

  IF p_was_correct THEN
    v_state.consecutive_correct := v_state.consecutive_correct + 1;
    v_state.consecutive_incorrect := 0;
  ELSE
    v_state.consecutive_incorrect := v_state.consecutive_incorrect + 1;
    v_state.consecutive_correct := 0;
  END IF;

  v_new_difficulty := v_state.current_difficulty;

  IF v_state.consecutive_correct >= 3 THEN
    CASE v_state.current_difficulty
      WHEN 'easy' THEN v_new_difficulty := 'medium';
      WHEN 'medium' THEN v_new_difficulty := 'hard';
      WHEN 'hard' THEN v_new_difficulty := 'hard';
    END CASE;
    v_state.consecutive_correct := 0;
  END IF;

  IF v_state.consecutive_incorrect >= 2 THEN
    CASE v_state.current_difficulty
      WHEN 'hard' THEN v_new_difficulty := 'medium';
      WHEN 'medium' THEN v_new_difficulty := 'easy';
      WHEN 'easy' THEN v_new_difficulty := 'easy';
    END CASE;
    v_state.consecutive_incorrect := 0;
  END IF;

  v_state.current_difficulty := v_new_difficulty;
  v_state.updated_at := now();

  UPDATE user_difficulty_state
  SET current_difficulty = v_state.current_difficulty,
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

CREATE OR REPLACE FUNCTION public.increment_recycle_count(p_user_id uuid, p_question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.user_question_progress
  SET recycle_count = recycle_count + 1
  WHERE user_id = p_user_id AND question_id = p_question_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unseen_questions_for_user(p_user_id uuid, p_chapter_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, chapter_id uuid, text text, option_a text, option_b text, option_c text, option_d text, source question_source, status question_status, difficulty question_difficulty, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
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
END;
$$;

CREATE OR REPLACE FUNCTION public.count_unseen_questions(p_user_id uuid, p_chapter_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COUNT(*)::integer
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id
      AND q.status = 'active'
      AND q.id NOT IN (
        SELECT uqp.question_id FROM public.user_question_progress uqp
        WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      )
  );
END;
$$;
