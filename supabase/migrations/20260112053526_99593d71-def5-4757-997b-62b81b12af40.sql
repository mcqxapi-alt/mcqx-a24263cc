-- Create a public-facing view that excludes correct_answer and explanation (for pre-answer state)
CREATE OR REPLACE VIEW public.questions_public AS
SELECT 
  id, 
  chapter_id, 
  text, 
  option_a, 
  option_b, 
  option_c, 
  option_d, 
  source, 
  status, 
  created_at, 
  updated_at
FROM public.questions
WHERE status = 'active';

-- Grant access to the view (views bypass RLS by default)
GRANT SELECT ON public.questions_public TO anon, authenticated;

-- Create a secure function to validate answers server-side
-- This returns the correct_answer and explanation only AFTER the user submits their answer
CREATE OR REPLACE FUNCTION public.validate_answer(
  p_question_id uuid,
  p_selected_answer integer
)
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
  -- Get the question's correct answer (bypasses RLS via SECURITY DEFINER)
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

-- Create function to get answers for multiple questions at once (for results screen)
CREATE OR REPLACE FUNCTION public.get_question_answers(p_question_ids uuid[])
RETURNS TABLE(
  question_id uuid,
  correct_answer integer,
  explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.correct_answer, q.explanation
  FROM public.questions q
  WHERE q.id = ANY(p_question_ids) AND q.status = 'active';
END;
$$;

-- Drop the public-facing SELECT policy that exposes correct_answer
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;

-- Keep admin-only full access (already exists, but ensure it's there)
-- Admins can still see everything through the table directly