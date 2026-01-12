-- The view with security_invoker needs the underlying table to have a SELECT policy
-- We need to add a policy that allows access to read questions but NOT the correct_answer column
-- Since we can't do column-level RLS, we'll change the view to security_definer approach

-- Drop existing view
DROP VIEW IF EXISTS public.questions_public;

-- Recreate as a function-based approach with security definer
-- This function returns questions without sensitive columns
CREATE OR REPLACE FUNCTION public.get_public_questions(p_chapter_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(
  id uuid,
  chapter_id uuid,
  text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  source question_source,
  status question_status,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id, 
    q.chapter_id, 
    q.text, 
    q.option_a, 
    q.option_b, 
    q.option_c, 
    q.option_d, 
    q.source, 
    q.status, 
    q.created_at, 
    q.updated_at
  FROM public.questions q
  WHERE q.chapter_id = p_chapter_id 
    AND q.status = 'active'
  LIMIT p_limit;
$$;

-- Function to get questions by IDs (for challenges)
CREATE OR REPLACE FUNCTION public.get_questions_by_ids(p_question_ids uuid[])
RETURNS TABLE(
  id uuid,
  chapter_id uuid,
  text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  source question_source,
  status question_status,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id, 
    q.chapter_id, 
    q.text, 
    q.option_a, 
    q.option_b, 
    q.option_c, 
    q.option_d, 
    q.source, 
    q.status, 
    q.created_at, 
    q.updated_at
  FROM public.questions q
  WHERE q.id = ANY(p_question_ids) 
    AND q.status = 'active';
$$;