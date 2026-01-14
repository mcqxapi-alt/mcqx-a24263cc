-- Add new columns for real-time challenge mode
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS challenger_ready boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS opponent_ready boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS challenger_finished_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS opponent_finished_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS challenger_answers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS opponent_answers jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS challenger_time_ms integer,
ADD COLUMN IF NOT EXISTS opponent_time_ms integer;

-- Update status to use new states by changing the enum
-- First, rename old enum values to new ones
ALTER TYPE challenge_status ADD VALUE IF NOT EXISTS 'lobby';
ALTER TYPE challenge_status ADD VALUE IF NOT EXISTS 'playing';
ALTER TYPE challenge_status ADD VALUE IF NOT EXISTS 'finished';

-- Create challenge_progress table for real-time progress tracking
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  current_question integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS on challenge_progress
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge_progress
CREATE POLICY "Users can view progress for challenges they're part of"
ON public.challenge_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_id 
    AND (c.challenger_id = auth.uid() OR c.opponent_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own progress"
ON public.challenge_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.challenge_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for challenges and challenge_progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_progress;