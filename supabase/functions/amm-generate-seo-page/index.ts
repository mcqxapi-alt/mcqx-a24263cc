import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function safeJson(s: string): any {
  // Strip ```json fences if present
  const cleaned = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    // Try to extract first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Model did not return JSON");
  }
}

interface ChapterCtx {
  chapter_id: string;
  chapter_name: string;
  subject_name: string;
  class_name: string;
  board_name: string;
}

async function loadChapterCtx(admin: any, chapter_id: string): Promise<ChapterCtx | null> {
  const { data: ch } = await admin
    .from("chapters").select("id, name, subject_id").eq("id", chapter_id).maybeSingle();
  if (!ch) return null;
  const { data: subj } = await admin
    .from("subjects").select("id, name, class_id").eq("id", ch.subject_id).maybeSingle();
  if (!subj) return null;
  const { data: cls } = await admin
    .from("classes").select("id, name, board_id").eq("id", subj.class_id).maybeSingle();
  if (!cls) return null;
  const { data: brd } = await admin
    .from("boards").select("id, name").eq("id", cls.board_id).maybeSingle();
  if (!brd) return null;
  return {
    chapter_id: ch.id,
    chapter_name: ch.name,
    subject_name: subj.name,
    class_name: cls.name,
    board_name: brd.name,
  };
}

async function generateOne(admin: any, lovableKey: string, chapter_id: string) {
  const ctx = await loadChapterCtx(admin, chapter_id);
  if (!ctx) return { chapter_id, skipped: "chapter not found" };

  // Pick 5 active verified-preferred questions
  const { data: questions } = await admin
    .from("questions")
    .select("id, text, source, status")
    .eq("chapter_id", chapter_id)
    .eq("status", "active")
    .order("source", { ascending: true }) // 'verified' < 'ai_generated' alphabetically — verified first
    .limit(20);

  if (!questions || questions.length < 3) {
    return { chapter_id, skipped: "not enough questions" };
  }
  const picked = questions.slice(0, 5);
  const question_ids = picked.map((q: any) => q.id);

  const slug = slugify(`${ctx.board_name}-${ctx.class_name}-${ctx.subject_name}-${ctx.chapter_name}`);

  // Generate copy with Lovable AI
  const prompt = `You are an SEO copywriter for MCQX, an Indian exam prep MCQ platform. Write copy for a landing page about a single chapter.

Context:
- Board: ${ctx.board_name}
- Class: ${ctx.class_name}
- Subject: ${ctx.subject_name}
- Chapter: ${ctx.chapter_name}

Return STRICT JSON only — no markdown fences, no commentary — with this exact shape:
{
  "title": "<= 60 chars, must include chapter + class + 'MCQ' or 'Questions'",
  "meta_description": "<= 155 chars, search-friendly, single sentence with a clear call to practice",
  "intro_md": "150-220 words plain text (no markdown headings, no asterisks). 3 short paragraphs. Para 1: why this chapter matters for ${ctx.board_name} ${ctx.class_name} ${ctx.subject_name} exams. Para 2: what core ideas the chapter covers. Para 3: how practising MCQs on MCQX helps — mention instant feedback and adaptive difficulty.",
  "faq": [
    {"q": "How many MCQs are on this chapter?", "a": "..."},
    {"q": "Are these questions aligned to ${ctx.board_name} ${ctx.class_name} syllabus?", "a": "..."},
    {"q": "Can I practise without signing in?", "a": "Yes — practice is open to guests; sign in to save streaks and stats."},
    {"q": "What difficulty levels are covered?", "a": "..."}
  ]
}`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a precise SEO copywriter. Output JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!aiRes.ok) {
    const txt = await aiRes.text();
    throw new Error(`AI gateway ${aiRes.status}: ${txt.slice(0, 200)}`);
  }
  const aiJson = await aiRes.json();
  const content = aiJson?.choices?.[0]?.message?.content ?? "";
  const parsed = safeJson(content);

  const row = {
    chapter_id,
    slug,
    board_name: ctx.board_name,
    class_name: ctx.class_name,
    subject_name: ctx.subject_name,
    chapter_name: ctx.chapter_name,
    title: String(parsed.title).slice(0, 70),
    meta_description: String(parsed.meta_description).slice(0, 160),
    intro_md: String(parsed.intro_md),
    faq: Array.isArray(parsed.faq) ? parsed.faq.slice(0, 6) : [],
    question_ids,
    published: true,
    generated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("seo_pages")
    .upsert(row, { onConflict: "chapter_id" });

  if (error) throw new Error(error.message);
  return { chapter_id, slug, ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Admin gate for manual runs
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roleRow } = await admin
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!roleRow) {
          return new Response(JSON.stringify({ error: "Admin only" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const single: string | undefined = body.chapter_id;
    const batchSize: number = Math.min(Math.max(Number(body.batch_size) || 5, 1), 10);

    const targets: string[] = [];
    if (single) {
      targets.push(single);
    } else {
      // Pick chapters that have >=3 active questions and no seo_page yet, or seo_page older than 30 days
      const { data: candidates } = await admin.rpc("get_seo_candidates", { p_limit: batchSize })
        .catch(() => ({ data: null as any }));

      if (candidates && Array.isArray(candidates) && candidates.length > 0) {
        for (const c of candidates) targets.push(c.chapter_id);
      } else {
        // Fallback: simple query — chapters with no seo_page
        const { data: chs } = await admin
          .from("chapters").select("id").limit(50);
        const ids = (chs ?? []).map((c: any) => c.id);
        const { data: existing } = await admin
          .from("seo_pages").select("chapter_id").in("chapter_id", ids);
        const have = new Set((existing ?? []).map((r: any) => r.chapter_id));
        for (const id of ids) {
          if (!have.has(id)) targets.push(id);
          if (targets.length >= batchSize) break;
        }
      }
    }

    const results: any[] = [];
    for (const cid of targets) {
      try {
        results.push(await generateOne(admin, LOVABLE_API_KEY, cid));
      } catch (e) {
        results.push({ chapter_id: cid, error: String(e instanceof Error ? e.message : e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
