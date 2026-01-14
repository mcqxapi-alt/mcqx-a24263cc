-- Create table to track which questions users have answered
CREATE TABLE public.user_question_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id uuid NOT NULL,
    chapter_id uuid NOT NULL,
    answered_at timestamp with time zone NOT NULL DEFAULT now(),
    was_correct boolean,
    UNIQUE (user_id, question_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_user_question_progress_user_chapter ON public.user_question_progress(user_id, chapter_id);
CREATE INDEX idx_user_question_progress_question ON public.user_question_progress(question_id);

-- Enable RLS
ALTER TABLE public.user_question_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own progress
CREATE POLICY "Users can view their own progress"
ON public.user_question_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.user_question_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_question_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create RPC function to get unseen questions for authenticated users
CREATE OR REPLACE FUNCTION public.get_unseen_questions_for_user(
    p_user_id uuid,
    p_chapter_id uuid,
    p_limit integer DEFAULT 20
)
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
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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
      AND q.id NOT IN (
          SELECT uqp.question_id 
          FROM public.user_question_progress uqp 
          WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      )
    ORDER BY RANDOM()
    LIMIT p_limit;
$$;

-- Create RPC function to get random questions for guests (no tracking)
CREATE OR REPLACE FUNCTION public.get_random_questions_for_guest(
    p_chapter_id uuid,
    p_limit integer DEFAULT 20
)
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
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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
    ORDER BY RANDOM()
    LIMIT p_limit;
$$;

-- Create RPC function to count remaining unseen questions for a user
CREATE OR REPLACE FUNCTION public.count_unseen_questions(
    p_user_id uuid,
    p_chapter_id uuid
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT COUNT(*)::integer
    FROM public.questions q
    WHERE q.chapter_id = p_chapter_id 
      AND q.status = 'active'
      AND q.id NOT IN (
          SELECT uqp.question_id 
          FROM public.user_question_progress uqp 
          WHERE uqp.user_id = p_user_id AND uqp.chapter_id = p_chapter_id
      );
$$;

-- Create RPC function to record question progress
CREATE OR REPLACE FUNCTION public.record_question_progress(
    p_user_id uuid,
    p_question_id uuid,
    p_chapter_id uuid,
    p_was_correct boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.user_question_progress (user_id, question_id, chapter_id, was_correct)
    VALUES (p_user_id, p_question_id, p_chapter_id, p_was_correct)
    ON CONFLICT (user_id, question_id) DO UPDATE SET
        was_correct = p_was_correct,
        answered_at = now();
END;
$$;