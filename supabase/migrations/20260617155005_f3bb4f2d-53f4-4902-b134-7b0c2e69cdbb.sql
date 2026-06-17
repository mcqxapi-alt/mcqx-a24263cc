
-- Phase 2: SEO landing pages
CREATE TABLE public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL UNIQUE REFERENCES public.chapters(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  board_name text NOT NULL,
  class_name text NOT NULL,
  subject_name text NOT NULL,
  chapter_name text NOT NULL,
  title text NOT NULL,
  meta_description text NOT NULL,
  intro_md text NOT NULL,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  published boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_pages TO anon, authenticated;
GRANT ALL ON public.seo_pages TO service_role;

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published SEO pages"
  ON public.seo_pages FOR SELECT
  USING (published = true);

CREATE POLICY "Admins manage SEO pages"
  ON public.seo_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_seo_pages_published ON public.seo_pages(published) WHERE published = true;

-- RPC: get a single published SEO page by slug
CREATE OR REPLACE FUNCTION public.get_seo_page(p_slug text)
RETURNS TABLE(
  id uuid, chapter_id uuid, slug text,
  board_name text, class_name text, subject_name text, chapter_name text,
  title text, meta_description text, intro_md text, faq jsonb,
  question_ids uuid[], generated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, chapter_id, slug, board_name, class_name, subject_name, chapter_name,
         title, meta_description, intro_md, faq, question_ids, generated_at
  FROM public.seo_pages
  WHERE slug = p_slug AND published = true;
$$;

-- RPC: list all published slugs for sitemap
CREATE OR REPLACE FUNCTION public.list_seo_slugs()
RETURNS TABLE(slug text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT slug, updated_at FROM public.seo_pages WHERE published = true ORDER BY updated_at DESC;
$$;

-- RPC: increment view counter (anon-friendly fire-and-forget)
CREATE OR REPLACE FUNCTION public.increment_seo_view(p_slug text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.seo_pages SET view_count = view_count + 1 WHERE slug = p_slug;
$$;

GRANT EXECUTE ON FUNCTION public.get_seo_page(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_seo_slugs() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_seo_view(text) TO anon, authenticated;
