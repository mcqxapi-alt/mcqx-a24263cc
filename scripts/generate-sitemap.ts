// Runs before `vite dev` and `vite build` via predev/prebuild hooks.
// Writes public/sitemap.xml with static routes + all published SEO landing pages.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://mcqx.lovable.app";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uzscharnnojiavsswstv.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6c2NoYXJubm9qaWF2c3N3c3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzYzMjgsImV4cCI6MjA4MzAxMjMyOH0.f_jv6FOVSaf_7bkUt4fEm238MCdMsl4NyByaqyp7Q2Q";

interface Entry {
  path: string;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

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
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: "{}",
    });
    if (!res.ok) {
      console.warn(`[sitemap] list_seo_slugs ${res.status} — skipping dynamic pages`);
      return [];
    }
    const rows = (await res.json()) as Array<{ slug: string; updated_at: string }>;
    return rows.map((r) => ({
      path: `/learn/${r.slug}`,
      changefreq: "weekly",
      priority: "0.8",
      lastmod: r.updated_at?.slice(0, 10),
    }));
  } catch (e) {
    console.warn("[sitemap] failed to fetch SEO slugs:", e);
    return [];
  }
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

(async () => {
  const dynamicEntries = await fetchSeoSlugs();
  const all = [...staticEntries, ...dynamicEntries];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...all.map(renderEntry),
    "</urlset>",
  ].join("\n");
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`[sitemap] wrote ${all.length} entries (${dynamicEntries.length} dynamic)`);
})();
