// Submits sitemap + inspects/indexes new URLs via Google Search Console connector gateway.
// Requires the user to link the "google_search_console" connector in Lovable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://mcqx.lovable.app";
const SITE_ENC = encodeURIComponent(SITE + "/");
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

async function gsc(path: string, init: RequestInit = {}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gscKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableKey || !gscKey) {
    throw new Error("Google Search Console connector not linked");
  }
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gscKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const out: any = { steps: [] };

    // 1) Make sure the site is registered (idempotent PUT)
    const add = await gsc(`/webmasters/v3/sites/${SITE_ENC}`, { method: "PUT" });
    out.steps.push({ step: "register_site", status: add.status });

    // 2) Submit the sitemap
    const sm = await gsc(
      `/webmasters/v3/sites/${SITE_ENC}/sitemaps/${encodeURIComponent(SITE + "/sitemap.xml")}`,
      { method: "PUT" },
    );
    out.steps.push({ step: "submit_sitemap", status: sm.status });

    // 3) IndexNow ping for newly-published SEO pages (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: fresh } = await admin
      .from("seo_pages")
      .select("slug")
      .eq("published", true)
      .gte("generated_at", since)
      .limit(10000);

    const urls = (fresh ?? []).map((r: any) => `${SITE}/learn/${r.slug}`);
    out.steps.push({ step: "fresh_urls", count: urls.length });

    if (urls.length > 0) {
      const key = "b96cd1922891f30437f9ae0049aef06b";
      const inow = await fetch("https://api.indexnow.org/IndexNow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: "mcqx.lovable.app",
          key,
          keyLocation: `${SITE}/${key}.txt`,
          urlList: urls,
        }),
      });
      out.steps.push({ step: "indexnow", status: inow.status });
    }

    // Log to amm_events
    await admin.from("amm_events").insert({
      event_type: "gsc_submit",
      payload: out,
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, ...out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
