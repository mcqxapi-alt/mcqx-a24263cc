// Runs before `vite dev` and `vite build` via predev/prebuild hooks.
// Writes a sitemap index plus per-namespace sitemaps so a bad exam page
// can't poison the chapter URL set in Google's eyes.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://mcqx.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uzscharnnojiavsswstv.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6c2NoYXJubm9qaWF2c3N3c3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzYzMjgsImV4cCI6MjA4MzAxMjMyOH0.f_jv6FOVSaf_7bkUt4fEm238MCdMsl4NyByaqyp7Q2Q";

interface Entry { path: string; changefreq?: string; priority?: string; lastmod?: string; }

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/practice", changefreq: "weekly", priority: "0.9" },
  { path: "/challenge", changefreq: "weekly", priority: "0.8" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.7" },
  { path: "/analytics", changefreq: "weekly", priority: "0.6" },
  { path: "/login", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
];

async function fetchSeoSlugs(): Promise<Entry[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/list_seo_slugs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: "{}",
    });
    if (!res.ok) { console.warn(`[sitemap] list_seo_slugs ${res.status}`); return []; }
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string }>;
    return rows.map(r => ({ path: `/learn/${r.slug}`, changefreq: "weekly", priority: "0.8", lastmod: r.updated_at?.slice(0, 10) }));
  } catch (e) { console.warn("[sitemap] learn fetch failed:", e); return []; }
}

async function fetchExamSlugs(): Promise<Entry[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/exam_pages?select=slug,updated_at&published=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) { console.warn(`[sitemap] exam_pages ${res.status}`); return []; }
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string }>;
    // Throttle: never expose more than 5 newly-published exam pages per day to avoid spike penalty
    const today = new Date().toISOString().slice(0, 10);
    const todays = rows.filter(r => (r.updated_at ?? "").slice(0, 10) === today);
    const older = rows.filter(r => (r.updated_at ?? "").slice(0, 10) !== today);
    const throttled = [...older, ...todays.slice(0, 5)];
    return throttled.map(r => ({ path: `/exam/${r.slug}`, changefreq: "weekly", priority: "0.7", lastmod: r.updated_at?.slice(0, 10) }));
  } catch (e) { console.warn("[sitemap] exam fetch failed:", e); return []; }
}

function renderEntry(e: Entry): string {
  return [
    "  <url>",
    `    <loc>${BASE_URL}${e.path}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    "  </url>",
  ].filter(Boolean).join("\n");
}

function urlset(entries: Entry[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderEntry),
    "</urlset>",
  ].join("\n");
}

function sitemapIndex(maps: Array<{ loc: string; lastmod: string }>): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...maps.map(m => `  <sitemap>\n    <loc>${m.loc}</loc>\n    <lastmod>${m.lastmod}</lastmod>\n  </sitemap>`),
    "</sitemapindex>",
  ].join("\n");
}

(async () => {
  const [learn, exam] = await Promise.all([fetchSeoSlugs(), fetchExamSlugs()]);
  const today = new Date().toISOString().slice(0, 10);

  writeFileSync(resolve("public/sitemap-learn.xml"), urlset([...staticEntries, ...learn]));
  writeFileSync(resolve("public/sitemap-exam.xml"), urlset(exam));
  writeFileSync(resolve("public/sitemap.xml"), sitemapIndex([
    { loc: `${BASE_URL}/sitemap-learn.xml`, lastmod: today },
    { loc: `${BASE_URL}/sitemap-exam.xml`, lastmod: today },
  ]));

  console.log(`[sitemap] index + learn(${staticEntries.length + learn.length}) + exam(${exam.length})`);
})();
