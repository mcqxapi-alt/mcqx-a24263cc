-- Recreate the view with SECURITY INVOKER (the default, but explicit is better)
-- This ensures the view uses the querying user's permissions
DROP VIEW IF EXISTS public.questions_public;

CREATE VIEW public.questions_public
WITH (security_invoker = true)
AS
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

-- Grant access to the view
GRANT SELECT ON public.questions_public TO anon, authenticated;