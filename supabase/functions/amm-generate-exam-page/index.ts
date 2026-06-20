// Generates an exam-target landing page draft. NEVER publishes.
// Sets status='ready_for_review' only if quality gate passes (intro≥800 words, ≥15 MCQs).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_WORDS = 800;
const MIN_MCQ = 15;

function safeJson(s: string): any {
  const cleaned = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Model did not return JSON");
  }
}

function wordCount(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length;
}

async function generate(admin: any, lovableKey: string, exam_id: string) {
  const { data: exam, error: exErr } = await admin
    .from("exam_targets").select("*").eq("id", exam_id).maybeSingle();
  if (exErr || !exam) throw new Error("exam_target not found");

  // Collect available MCQs from seed chapters (if any)
  let question_ids: string[] = [];
  if (Array.isArray(exam.seed_chapter_ids) && exam.seed_chapter_ids.length) {
    const { data: qs } = await admin
      .from("questions")
      .select("id")
      .in("chapter_id", exam.seed_chapter_ids)
      .eq("status", "active")
      .limit(40);
    question_ids = (qs ?? []).map((q: any) => q.id);
  }

  const langInstruction =
    exam.language === "hi" ? "Write the intro_md and FAQ answers in clear, formal Hindi (Devanagari). FAQ questions stay in Hindi too."
    : exam.language === "ta" ? "Write the intro_md and FAQ in Tamil script."
    : exam.language === "bn" ? "Write the intro_md and FAQ in Bengali script."
    : "Write in clear, simple English suitable for rural Indian aspirants.";

  const syllabus = Array.isArray(exam.syllabus_json) ? exam.syllabus_json.join(", ") : "";

  const prompt = `You are an SEO copywriter for MCQX, a free Indian competitive-exam MCQ platform aimed at underserved aspirants. Draft a landing page for the "${exam.name}" exam (region: ${exam.region}, ~${exam.annual_aspirants?.toLocaleString?.() ?? "many"} annual aspirants).

${langInstruction}

Return STRICT JSON only (no fences) matching:
{
  "title": "<= 60 chars, must include exam name + 'MCQ' or 'Practice'",
  "meta_description": "<= 155 chars, single sentence, mentions free practice + the exam name",
  "intro_md": "900-1200 words plain text. Use short paragraphs separated by blank lines. NO markdown headings or asterisks. Cover: who takes this exam, eligibility, why it matters in ${exam.region}, exam pattern & marking, the full syllabus (${syllabus}), preparation strategy with concrete week-by-week tips, common pitfalls, and why timed MCQ practice on MCQX helps. Mention real cut-offs/salary ranges where well-known. Be factual and concrete — no fluff.",
  "syllabus_md": "200-350 words plain text listing each syllabus section as a short paragraph (Section name — topics covered — typical weightage if known). Subjects to cover: ${syllabus}.",
  "faq": [
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."},
    {"q": "...", "a": "..."}
  ]
}

The 6 FAQs must cover: eligibility, exam pattern, syllabus changes, best preparation books, whether MCQX practice is free, and how to use MCQX without signing in.`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: "You are a precise, factual SEO copywriter. Output JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!aiRes.ok) {
    const txt = await aiRes.text();
    throw new Error(`AI gateway ${aiRes.status}: ${txt.slice(0, 300)}`);
  }
  const aiJson = await aiRes.json();
  const content = aiJson?.choices?.[0]?.message?.content ?? "";
  const parsed = safeJson(content);

  const intro_md = String(parsed.intro_md ?? "");
  const syllabus_md = String(parsed.syllabus_md ?? "");
  const wc = wordCount(intro_md) + wordCount(syllabus_md);
  const mcqCount = question_ids.length;

  // Quality gate scoring
  let score = 0;
  if (wc >= MIN_WORDS) score += 40; else score += Math.round((wc / MIN_WORDS) * 40);
  if (mcqCount >= MIN_MCQ) score += 40; else score += Math.round((mcqCount / MIN_MCQ) * 40);
  if (Array.isArray(parsed.faq) && parsed.faq.length >= 5) score += 20;

  const gatePassed = wc >= MIN_WORDS && mcqCount >= MIN_MCQ && Array.isArray(parsed.faq) && parsed.faq.length >= 5;
  const newStatus = gatePassed ? "ready_for_review" : "draft";

  const pageRow = {
    exam_id,
    slug: exam.slug,
    title: String(parsed.title ?? exam.name).slice(0, 70),
    meta_description: String(parsed.meta_description ?? "").slice(0, 160),
    intro_md,
    syllabus_md,
    faq: Array.isArray(parsed.faq) ? parsed.faq.slice(0, 8) : [],
    question_ids,
    language: exam.language,
    published: false, // ALWAYS false — only the admin Publish button flips this
    generated_at: new Date().toISOString(),
  };

  const { error: upErr } = await admin
    .from("exam_pages")
    .upsert(pageRow, { onConflict: "slug" });
  if (upErr) throw new Error(upErr.message);

  await admin.from("exam_targets").update({
    status: newStatus,
    quality_score: score,
    word_count: wc,
    mcq_count: mcqCount,
    last_quality_check: new Date().toISOString(),
  }).eq("id", exam_id);

  return {
    exam_id, slug: exam.slug,
    quality_score: score,
    word_count: wc,
    mcq_count: mcqCount,
    status: newStatus,
    gate_passed: gatePassed,
    gate_reasons: gatePassed ? [] : [
      wc < MIN_WORDS ? `intro+syllabus only ${wc} words (need ≥${MIN_WORDS})` : null,
      mcqCount < MIN_MCQ ? `only ${mcqCount} MCQs available (need ≥${MIN_MCQ}; attach seed_chapter_ids)` : null,
      !(Array.isArray(parsed.faq) && parsed.faq.length >= 5) ? "fewer than 5 FAQs" : null,
    ].filter(Boolean),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Admin gate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const exam_id: string | undefined = body.exam_id;
    if (!exam_id) {
      return new Response(JSON.stringify({ error: "exam_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await generate(admin, LOVABLE_API_KEY, exam_id);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
