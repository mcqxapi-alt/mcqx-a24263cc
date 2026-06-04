# Autonomous Marketing Manager (AMM)

A backend "AI growth officer" that monitors signups vs the 500/month target, decides what lever to pull each day (content, social, in-app nudges), and executes — with a private admin cockpit to watch and override it.

## What ships

### Phase 1 — Brain + Cockpit (this build)
The foundation. Without this, the rest is just spam.

1. **`/admin/marketing` cockpit** (admin-only, behind existing RBAC)
   - **North-star card**: signups this month / 500, daily run-rate, projected EOM, on/off-track badge
   - **Funnel**: visitors → signups → first practice → 5+ sessions → returning
   - **AMM activity log**: every decision the AI made, what it did, outcome
   - **Manual override**: pause AMM, force-run a cycle, edit drafts before they ship

2. **`amm-daily-cycle` edge function** (cron, runs 09:00 IST daily)
   - Pulls last 24h metrics (signups, sessions, top chapters, drop-off points)
   - Calls Lovable AI (Gemini 2.5 Pro) with full context + the 500 target
   - AI returns a JSON action plan: `{ social_posts: [...], seo_pages: [...], in_app_campaigns: [...], reasoning: "..." }`
   - Writes plan to `amm_decisions` table, queues actions

3. **DB tables**
   - `amm_targets` (month, metric, goal, current)
   - `amm_decisions` (date, reasoning, actions_json, status)
   - `amm_content` (type: social/seo/email, body, status: draft/scheduled/published, scheduled_for, channel, external_id, metrics)
   - `amm_events` (lightweight pageview/signup attribution for funnel)

### Phase 2 — SEO content engine (in-app, fully auto)
Highest ROI for 500-user target. No external API keys needed.

1. **Programmatic landing pages** `/learn/:board/:class/:subject/:chapter`
   - AI-generated intro (300 words, NCERT-accurate), 5 sample MCQs from DB, CTA to practice
   - Server-rendered SEO metadata, JSON-LD `Quiz` schema, auto-added to sitemap
   - AMM picks which chapters to generate next based on Semrush keyword volume (already connected? confirm)
2. **Auto-sitemap regeneration** on new page publish
3. **Internal linking**: AMM inserts contextual links between related chapter pages

### Phase 3 — In-app growth loops (fully auto)
1. **Streak-save nudge**: toast at 23h since last practice if streak ≥2
2. **Smart share prompts**: after a >80% score, "Flex this" CTA with pre-filled Web Share payload (already partly exists — AMM tunes copy + frequency per user)
3. **Referral**: every signed-in user gets `/r/:code`, both sides get a badge + 7-day "challenge unlimited"
4. **Win-back email** (requires Lovable Emails or Resend) — fired by AMM to users idle 4+ days

### Phase 4 — External social posting (truly autonomous)
Requires you to connect accounts. Asking up front so we don't half-build it.

- **Twitter/X**: needs Developer account + 4 keys (Consumer Key/Secret, Access Token/Secret) with Read+Write
- **LinkedIn**: no Lovable connector → needs custom OAuth app + 6-week review for organic posting permission. Realistically skip for v1.
- **Instagram**: only via Meta Graph API + business account + Facebook page link. Heavy. Skip for v1.
- **Recommendation**: ship Twitter auto-post + a "copy to clipboard" queue for IG/LinkedIn (you paste, 30 sec/day)

## Technical details

- Edge functions: `amm-daily-cycle`, `amm-execute-action`, `amm-generate-seo-page`, `amm-post-twitter`
- Cron via `pg_cron` + `pg_net` (already standard pattern)
- All AI calls via Lovable AI Gateway (no key cost) — Gemini 2.5 Pro for planning, Flash for content
- All tables RLS-locked to `admin` role via `has_role()`
- Attribution: lightweight `?utm_source=amm_<channel>_<decision_id>` on every AMM-generated link, captured into `amm_events` on `/` page load

## What I need from you to start Phase 1

1. **Confirm**: ship Phase 1 + Phase 2 (SEO engine) first? They alone realistically hit 500/month for an MCQ niche site.
2. **Resend or Lovable Emails** for Phase 3 win-back emails?
3. **Twitter auto-post** in Phase 4 — do you already have a Developer account, or skip socials entirely and let AMM focus on SEO + in-app?

I'd strongly suggest **Phase 1 + 2 now**, measure 2 weeks, then layer 3 + 4. Trying to ship all four in one go = 4 half-built systems instead of 2 great ones.
