
-- AMM Targets
CREATE TABLE public.amm_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,
  metric text NOT NULL,
  goal integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, metric)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amm_targets TO authenticated;
GRANT ALL ON public.amm_targets TO service_role;
ALTER TABLE public.amm_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage targets" ON public.amm_targets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AMM Decisions (daily AI action plans)
CREATE TABLE public.amm_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  reasoning text,
  metrics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | executed | failed | paused
  triggered_by text NOT NULL DEFAULT 'cron', -- cron | manual
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amm_decisions TO authenticated;
GRANT ALL ON public.amm_decisions TO service_role;
ALTER TABLE public.amm_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage decisions" ON public.amm_decisions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AMM Content (drafts / scheduled / published)
CREATE TABLE public.amm_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid REFERENCES public.amm_decisions(id) ON DELETE SET NULL,
  type text NOT NULL, -- social | seo_page | email | in_app
  channel text, -- twitter | instagram | linkedin | site | resend
  title text,
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft | scheduled | published | rejected
  scheduled_for timestamptz,
  published_at timestamptz,
  external_id text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.amm_content TO authenticated;
GRANT ALL ON public.amm_content TO service_role;
ALTER TABLE public.amm_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage content" ON public.amm_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER amm_content_set_updated_at BEFORE UPDATE ON public.amm_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AMM Events (attribution: anyone can insert a pageview)
CREATE TABLE public.amm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- pageview | signup | practice_start | session_complete | share
  source text, -- utm_source value e.g. amm_twitter_<decision_id>
  medium text,
  campaign text,
  path text,
  user_id uuid,
  session_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.amm_events TO authenticated;
GRANT INSERT ON public.amm_events TO anon, authenticated;
GRANT ALL ON public.amm_events TO service_role;
ALTER TABLE public.amm_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert events" ON public.amm_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read events" ON public.amm_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX amm_events_created_idx ON public.amm_events (created_at DESC);
CREATE INDEX amm_events_source_idx ON public.amm_events (source);
CREATE INDEX amm_decisions_run_date_idx ON public.amm_decisions (run_date DESC);
CREATE INDEX amm_content_status_idx ON public.amm_content (status, scheduled_for);

-- Seed initial target: 500 signups this month
INSERT INTO public.amm_targets (month, metric, goal)
VALUES (date_trunc('month', now())::date, 'signups', 500)
ON CONFLICT (month, metric) DO NOTHING;
