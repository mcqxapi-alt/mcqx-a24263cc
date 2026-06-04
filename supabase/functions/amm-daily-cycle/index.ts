import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth gate for manual runs (cron passes service key in apikey header)
    let triggeredBy: "cron" | "manual" = "cron";
    const authHeader = req.headers.get("Authorization");
    if (authHeader && req.method === "POST") {
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
        triggeredBy = "manual";
      }
    }

    // 1. Gather metrics snapshot
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ count: signupsMonth }, { count: signups24h }, { count: sessions24h }, { count: totalUsers }, { data: targetRow }, { data: topChapters }] = await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
      admin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", dayAgo),
      admin.from("sessions").select("*", { count: "exact", head: true }).gte("completed_at", dayAgo),
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("amm_targets").select("*").eq("month", monthStart.toISOString().slice(0, 10)).eq("metric", "signups").maybeSingle(),
      admin.from("sessions").select("chapter_id, chapters(name, subjects(name))").gte("completed_at", dayAgo).limit(20),
    ]);

    const goal = targetRow?.goal ?? 500;
    const daysInMonth = new Date(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0).getDate();
    const daysElapsed = Math.max(1, new Date().getUTCDate());
    const runRate = (signupsMonth ?? 0) / daysElapsed;
    const projected = Math.round(runRate * daysInMonth);
    const gap = goal - projected;

    const metrics = {
      goal, signups_month: signupsMonth ?? 0, signups_24h: signups24h ?? 0,
      sessions_24h: sessions24h ?? 0, total_users: totalUsers ?? 0,
      run_rate_per_day: Number(runRate.toFixed(1)), projected_eom: projected, gap_to_goal: gap,
      top_chapters: (topChapters ?? []).slice(0, 10),
    };

    // 2. Ask Gemini for an action plan
    const systemPrompt = `You are the Autonomous Marketing Manager for MCQX — a free mobile-first MCQ practice app for Indian students (Class 6-12 boards, CUET). Your job is to push the app to its monthly signup goal.

Output STRICT JSON only matching this shape:
{
  "reasoning": "2-3 sentences on why these actions, given the gap",
  "actions": [
    { "type": "social", "channel": "twitter|instagram|linkedin", "title": "short hook", "body": "post copy under 240 chars (twitter) or 2200 (ig)", "priority": "high|medium|low" },
    { "type": "seo_page", "title": "Class 12 X MCQs", "body": "300-word intro for SEO landing page on this chapter", "metadata": { "subject": "X", "chapter": "Y", "target_keyword": "..." } },
    { "type": "in_app", "title": "campaign name", "body": "what trigger + what nudge copy", "metadata": { "trigger": "idle_2_days|score_above_80|streak_at_risk" } }
  ]
}

Rules:
- Produce 4-7 actions total, mixed by type.
- Tone: Gen Z, witty, no cringe, no emojis-overload (max 2 per post).
- Hooks must be specific to Indian exams (CBSE, NCERT, JEE prep mindset, board fever).
- If gap is positive (behind goal) → urgent, aggressive, distribution-heavy.
- If gap is zero/negative (on track) → retention + word-of-mouth.`;

    const userPrompt = `Today's metrics:\n${JSON.stringify(metrics, null, 2)}\n\nGive me today's action plan.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "AI rate-limited, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiRes.status}: ${errText}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let plan: any = {};
    try { plan = JSON.parse(content); } catch { plan = { reasoning: "Failed to parse AI response", actions: [], raw: content }; }

    // 3. Persist decision
    const { data: decision, error: decErr } = await admin
      .from("amm_decisions")
      .insert({
        reasoning: plan.reasoning ?? "",
        metrics_snapshot: metrics,
        actions: plan.actions ?? [],
        triggered_by: triggeredBy,
        status: "pending",
      })
      .select()
      .single();
    if (decErr) throw decErr;

    // 4. Materialize actions into amm_content as drafts
    const drafts = (plan.actions ?? []).map((a: any) => ({
      decision_id: decision.id,
      type: a.type ?? "social",
      channel: a.channel ?? null,
      title: a.title ?? null,
      body: a.body ?? "",
      metadata: a.metadata ?? { priority: a.priority ?? "medium" },
      status: "draft",
    }));
    if (drafts.length) {
      const { error: cErr } = await admin.from("amm_content").insert(drafts);
      if (cErr) console.error("Insert content drafts failed:", cErr);
    }

    return new Response(JSON.stringify({ ok: true, decision_id: decision.id, action_count: drafts.length, metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("amm-daily-cycle error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
