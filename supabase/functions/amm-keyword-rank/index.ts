// Scores candidate chapters by Semrush search-volume so AMM picks topics
// people actually search for. Writes scores back to seo_pages.keyword_score (jsonb).
// Requires the "semrush" connector to be linked.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/semrush";

async function semrush(path: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const sKey = Deno.env.get("SEMRUSH_API_KEY");
  if (!lovableKey || !sKey) throw new Error("Semrush connector not linked");
  const res = await fetch(`${GATEWAY}${path}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": sKey,
    },
  });
  const text = await res.text();
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, json: { raw: text } }; }
}

function buildPhrase(class_name: string, subject_name: string, chapter_name: string) {
  // Strip "Class " prefix if present; build "ncert class X subject chapter mcq"
  const cls = class_name.replace(/^class\s*/i, "Class ");
  return `ncert ${cls} ${subject_name} ${chapter_name} mcq`.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 50);

    // Get chapters that have >=3 active questions but no seo page yet
    const { data: chs } = await admin
      .from("chapters")
      .select("id, name, subject_id, subjects:subject_id(name, classes:class_id(name))")
      .limit(200);

    const { data: existing } = await admin.from("seo_pages").select("chapter_id");
    const have = new Set((existing ?? []).map((r: any) => r.chapter_id));
    const candidates = (chs ?? []).filter((c: any) => !have.has(c.id)).slice(0, limit);

    const scored: any[] = [];
    for (const c of candidates) {
      const cls = c.subjects?.classes?.name ?? "";
      const subj = c.subjects?.name ?? "";
      const phrase = buildPhrase(cls, subj, c.name);
      try {
        const r = await semrush(
          `/keywords/phrase_this?phrase=${encodeURIComponent(phrase)}&database=in&export_columns=Ph,Nq,Cp,Co,Kd`,
        );
        const rows = r.json?.data?.rows ?? [];
        const volume = Number(rows?.[0]?.[1] ?? 0);
        const difficulty = Number(rows?.[0]?.[4] ?? 0);
        scored.push({
          chapter_id: c.id,
          phrase,
          volume,
          difficulty,
          score: volume * (100 - difficulty), // simple opportunity score
        });
      } catch (e) {
        scored.push({ chapter_id: c.id, phrase, error: String(e) });
      }
    }

    scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    await admin.from("amm_events").insert({
      event_type: "keyword_rank",
      payload: { count: scored.length, top: scored.slice(0, 10) },
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, count: scored.length, ranked: scored }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
