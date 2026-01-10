-- Allow authenticated users to insert AI-generated questions for challenges
CREATE POLICY "Authenticated users can insert questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (source = 'ai'::question_source);