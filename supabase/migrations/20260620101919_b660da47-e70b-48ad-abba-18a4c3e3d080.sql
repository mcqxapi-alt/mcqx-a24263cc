
-- exam_targets
CREATE TABLE public.exam_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  region text,
  tier smallint NOT NULL DEFAULT 1,
  annual_aspirants integer,
  syllabus_json jsonb DEFAULT '[]'::jsonb,
  seed_chapter_ids uuid[] DEFAULT '{}'::uuid[],
  status text NOT NULL DEFAULT 'draft',
  quality_score integer DEFAULT 0,
  word_count integer DEFAULT 0,
  mcq_count integer DEFAULT 0,
  last_quality_check timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exam_targets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_targets TO authenticated;
GRANT ALL ON public.exam_targets TO service_role;

ALTER TABLE public.exam_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read exam targets" ON public.exam_targets
  FOR SELECT USING (true);

CREATE POLICY "Admins manage exam targets" ON public.exam_targets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_exam_targets_updated
  BEFORE UPDATE ON public.exam_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- exam_pages
CREATE TABLE public.exam_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exam_targets(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_description text NOT NULL,
  intro_md text NOT NULL DEFAULT '',
  syllabus_md text NOT NULL DEFAULT '',
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  language text NOT NULL DEFAULT 'en',
  published boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exam_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_pages TO authenticated;
GRANT ALL ON public.exam_pages TO service_role;

ALTER TABLE public.exam_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published exam pages" ON public.exam_pages
  FOR SELECT USING (published = true);

CREATE POLICY "Admins read all exam pages" ON public.exam_pages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage exam pages" ON public.exam_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_exam_pages_updated
  BEFORE UPDATE ON public.exam_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Tier-1 exam drafts
INSERT INTO public.exam_targets (slug, name, language, region, tier, annual_aspirants, syllabus_json, status) VALUES
('agniveer', 'Agniveer (Indian Army, Navy, Air Force)', 'hi', 'India', 1, 2800000,
  '["General Knowledge","General Science","Mathematics","Reasoning","English"]'::jsonb, 'draft'),
('mp-vyapam-patwari', 'MP Vyapam Patwari', 'hi', 'Madhya Pradesh', 1, 1200000,
  '["General Knowledge","MP GK","Mathematics","General Hindi","General English","Computer Knowledge"]'::jsonb, 'draft'),
('tnpsc-group-4', 'TNPSC Group 4', 'ta', 'Tamil Nadu', 1, 2000000,
  '["General Studies","Aptitude","Tamil Eligibility Test","Current Affairs","Tamil Nadu History & Culture"]'::jsonb, 'draft');
