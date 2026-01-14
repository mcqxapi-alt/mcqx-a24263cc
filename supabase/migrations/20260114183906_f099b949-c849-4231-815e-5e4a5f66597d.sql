-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update challenges they're part of" ON public.challenges;

-- Create a more flexible update policy that allows:
-- 1. Participants to update their own fields
-- 2. Anyone to join an open challenge by setting themselves as opponent
CREATE POLICY "Users can update challenges they're part of or join open ones"
ON public.challenges
FOR UPDATE
USING (
  auth.uid() = challenger_id 
  OR auth.uid() = opponent_id 
  OR (status = 'open' AND opponent_id IS NULL)
)
WITH CHECK (
  -- Challengers and opponents can update
  auth.uid() = challenger_id 
  OR auth.uid() = opponent_id
  -- OR someone is joining an open challenge (setting themselves as opponent)
  OR (status = 'open' AND opponent_id IS NULL)
);