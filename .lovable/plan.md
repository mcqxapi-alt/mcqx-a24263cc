## Goal
Expand AMM to target underserved competitive exams (starting with Agniveer, MP Vyapam, TNPSC Group 4) **without** hurting existing SEO equity. Quality gates first, volume second.

## SEO-safety principles (non-negotiable)
1. **No thin pages.** Every `/exam/:slug` must ship with ≥800 words of unique intro + ≥15 verified MCQs + FAQ + syllabus before `published=true`. AMM publishes nothing that fails the gate.
2. **Staggered rollout.** Max 5 new exam pages/day to sitemap (Google distrusts sudden URL floods on small sites).
3. **Isolated URL namespace.** `/exam/...` is separate from `/learn/...` so a bad exam page can't poison chapter rankings. Sitemap split into `sitemap-learn.xml` + `sitemap-exam.xml`, both referenced from a sitemap index.
4. **noindex by default.** New exam pages render `<meta robots="noindex">` until the quality gate passes AND a human flips `published=true` in the admin cockpit. AMM can mark `ready_for_review`, never auto-publish.
5. **Internal linking discipline.** Exam pages link to relevant `/learn/:slug` chapters (Agniveer GK → Class 10 History/Geography chapters) — strengthens topical clusters instead of orphaning.
6. **Hreflang / lang attr.** Hindi-first exam pages get `<html lang="hi">` via Helmet and `hreflang="hi-IN"` so Google doesn't think it's spammy duplicate English content.

## Data model
New table `exam_targets`:
- slug (unique), name, language (hi/en/ta/bn/te), region, tier (1/2/3)
- annual_aspirants, syllabus_json, seed_chapter_ids (links to existing chapters)
- status: `draft` | `ready_for_review` | `published` | `archived`
- quality_score (0-100), word_count, mcq_count, last_quality_check

New table `exam_pages` (mirrors `seo_pages` but for `/exam/:slug`):
- exam_id → exam_targets, title, meta_description, intro_md, syllabus_md, faq jsonb, question_ids uuid[], published bool (defaults false), generated_at

Seed the 3 Tier-1 exams as `draft` rows — no public pages until reviewed.

## Edge functions
1. `amm-generate-exam-page` — takes exam_id, uses Lovable AI (Gemini 2.5 Pro) to draft intro (NCERT-grounded, Hindi for Agniveer/Vyapam), generates 30+ exam-specific MCQs via existing AI pipeline, sets status=`ready_for_review`. Runs the quality gate before saving.
2. `amm-exam-quality-gate` — shared helper: checks word_count ≥800, mcq_count ≥15, factual sanity via second-pass AI critique, returns score. Refuses to mark `ready_for_review` if score <70.

No new cron yet — manual trigger from cockpit until we've shipped & reviewed the first 3 pages.

## Frontend
- `src/pages/LearnExam.tsx` — renders exam page; honors `published` flag; emits `noindex` until published; Helmet with correct lang + hreflang.
- Route `/exam/:slug` in `App.tsx`.
- `src/pages/AdminMarketing.tsx` — new "Exam Targets" tab listing the 3 seeded rows with: Generate, Preview, Review & Publish buttons. Publish button is the ONLY way `published` flips to true.

## Sitemap
- Rename `public/sitemap.xml` → sitemap index referencing `sitemap-learn.xml` and `sitemap-exam.xml`.
- Update `scripts/generate-sitemap.ts` to emit both files; exam sitemap only includes `published=true` rows.

## Out of scope this round
- Tamil/Bengali Unicode work (TNPSC/WBPSC) — seed the row but don't generate until we add font/render testing.
- Auto-cron for exam generation — too risky until first 3 pages prove out.
- Backfilling existing chapters with exam tags.

## Files to create/edit
- migration: `exam_targets`, `exam_pages` tables + GRANTs + RLS + seed 3 Tier-1 rows as draft
- `supabase/functions/amm-generate-exam-page/index.ts`
- `supabase/functions/_shared/exam-quality-gate.ts`
- `src/pages/LearnExam.tsx` (new)
- `src/App.tsx` (add route)
- `src/pages/AdminMarketing.tsx` (Exam Targets tab)
- `scripts/generate-sitemap.ts` (split into index + 2 sitemaps)
- `public/sitemap.xml` (convert to index)
- `public/sitemap-learn.xml`, `public/sitemap-exam.xml` (new)
