-- Allow guests to validate answers (guest-first practice)
CREATE OR REPLACE FUNCTION public.validate_answer(p_question_id uuid, p_selected_answer integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_correct_answer integer;
  v_explanation text;
  v_is_correct boolean;
BEGIN
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
$function$;

-- Allow guests to fetch answers/explanations for the results screen
CREATE OR REPLACE FUNCTION public.get_question_answers(p_question_ids uuid[])
 RETURNS TABLE(question_id uuid, correct_answer integer, explanation text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT q.id, q.correct_answer, q.explanation
  FROM public.questions q
  WHERE q.id = ANY(p_question_ids) AND q.status = 'active';
$function$;