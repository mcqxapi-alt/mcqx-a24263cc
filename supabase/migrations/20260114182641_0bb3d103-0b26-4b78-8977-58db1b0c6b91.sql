-- Add unique constraint on challenge_progress for upsert to work
ALTER TABLE public.challenge_progress 
ADD CONSTRAINT challenge_progress_challenge_user_unique 
UNIQUE (challenge_id, user_id);