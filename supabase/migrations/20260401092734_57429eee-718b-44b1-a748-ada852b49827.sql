
-- 1. Create board_type enum
CREATE TYPE public.board_type AS ENUM ('board', 'competitive', 'state');

-- 2. Create boards table
CREATE TABLE public.boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.board_type NOT NULL DEFAULT 'board',
  icon TEXT NOT NULL DEFAULT 'book-open',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view boards"
  ON public.boards FOR SELECT
  TO public
  USING (true);

-- 3. Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view classes"
  ON public.classes FOR SELECT
  TO public
  USING (true);

-- 4. Add class_id to subjects (nullable for backward compat)
ALTER TABLE public.subjects ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

-- 5. Seed CBSE board
INSERT INTO public.boards (id, name, type, icon, display_order)
VALUES ('a0000000-0000-0000-0000-000000000001', 'CBSE', 'board', 'book-open', 1);

-- 6. Seed Classes 6-12 for CBSE
INSERT INTO public.classes (id, board_id, name, display_order) VALUES
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Class 6', 1),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Class 7', 2),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Class 8', 3),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Class 9', 4),
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Class 10', 5),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Class 11', 6),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Class 12', 7);

-- 7. Link all existing subjects to CBSE Class 12
UPDATE public.subjects SET class_id = 'c0000000-0000-0000-0000-000000000012';
