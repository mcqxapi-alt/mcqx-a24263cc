import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChapterStats {
  chapter_id: string;
  chapter_name: string;
  subject_name: string;
  subject_icon: string;
  total_attempts: number;
  correct_answers: number;
  accuracy: number;
  last_practiced: string | null;
  trend: "improving" | "declining" | "stable" | "new";
}

interface PerformanceData {
  chapters: ChapterStats[];
  overall_accuracy: number;
  total_questions_attempted: number;
  strongest_subject: string | null;
  weakest_subject: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all user sessions with chapter info
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        chapter_id,
        score,
        total_questions,
        completed_at,
        chapters:chapter_id (
          id,
          name,
          subjects:subject_id (name, icon)
        )
      `)
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    if (sessionsError) {
      console.error("Sessions error:", sessionsError);
      return new Response(JSON.stringify({ error: "Failed to fetch sessions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate stats per chapter
    const chapterMap = new Map<string, {
      chapter_id: string;
      chapter_name: string;
      subject_name: string;
      subject_icon: string;
      attempts: number;
      correct: number;
      sessions: { score: number; total: number; date: string }[];
    }>();

    for (const session of sessions || []) {
      const chapterId = session.chapter_id;
      const chapter = session.chapters as any;
      
      if (!chapter) continue;

      const existing = chapterMap.get(chapterId);
      if (existing) {
        existing.attempts += session.total_questions;
        existing.correct += session.score;
        existing.sessions.push({
          score: session.score,
          total: session.total_questions,
          date: session.completed_at,
        });
      } else {
        chapterMap.set(chapterId, {
          chapter_id: chapterId,
          chapter_name: chapter.name || "Unknown",
          subject_name: chapter.subjects?.name || "Unknown",
          subject_icon: chapter.subjects?.icon || "📚",
          attempts: session.total_questions,
          correct: session.score,
          sessions: [{
            score: session.score,
            total: session.total_questions,
            date: session.completed_at,
          }],
        });
      }
    }

    // Calculate trends and create final stats
    const chapterStats: ChapterStats[] = [];
    let totalAttempts = 0;
    let totalCorrect = 0;

    for (const [, data] of chapterMap) {
      totalAttempts += data.attempts;
      totalCorrect += data.correct;

      const accuracy = data.attempts > 0 
        ? Math.round((data.correct / data.attempts) * 100) 
        : 0;

      // Calculate trend based on recent vs older sessions
      let trend: ChapterStats["trend"] = "new";
      if (data.sessions.length >= 3) {
        const recentSessions = data.sessions.slice(0, Math.ceil(data.sessions.length / 2));
        const olderSessions = data.sessions.slice(Math.ceil(data.sessions.length / 2));

        const recentAccuracy = recentSessions.reduce((sum, s) => sum + s.score, 0) /
          recentSessions.reduce((sum, s) => sum + s.total, 0);
        const olderAccuracy = olderSessions.reduce((sum, s) => sum + s.score, 0) /
          olderSessions.reduce((sum, s) => sum + s.total, 0);

        const diff = recentAccuracy - olderAccuracy;
        if (diff > 0.05) trend = "improving";
        else if (diff < -0.05) trend = "declining";
        else trend = "stable";
      } else if (data.sessions.length >= 1) {
        trend = "stable";
      }

      chapterStats.push({
        chapter_id: data.chapter_id,
        chapter_name: data.chapter_name,
        subject_name: data.subject_name,
        subject_icon: data.subject_icon,
        total_attempts: data.attempts,
        correct_answers: data.correct,
        accuracy,
        last_practiced: data.sessions[0]?.date || null,
        trend,
      });
    }

    // Sort by accuracy (lowest first for weak areas)
    chapterStats.sort((a, b) => a.accuracy - b.accuracy);

    // Calculate subject-level stats
    const subjectMap = new Map<string, { attempts: number; correct: number }>();
    for (const stat of chapterStats) {
      const existing = subjectMap.get(stat.subject_name);
      if (existing) {
        existing.attempts += stat.total_attempts;
        existing.correct += stat.correct_answers;
      } else {
        subjectMap.set(stat.subject_name, {
          attempts: stat.total_attempts,
          correct: stat.correct_answers,
        });
      }
    }

    let strongestSubject: string | null = null;
    let weakestSubject: string | null = null;
    let highestAccuracy = -1;
    let lowestAccuracy = 101;

    for (const [name, data] of subjectMap) {
      if (data.attempts < 5) continue; // Need at least 5 attempts
      const acc = (data.correct / data.attempts) * 100;
      if (acc > highestAccuracy) {
        highestAccuracy = acc;
        strongestSubject = name;
      }
      if (acc < lowestAccuracy) {
        lowestAccuracy = acc;
        weakestSubject = name;
      }
    }

    const performanceData: PerformanceData = {
      chapters: chapterStats,
      overall_accuracy: totalAttempts > 0 
        ? Math.round((totalCorrect / totalAttempts) * 100) 
        : 0,
      total_questions_attempted: totalAttempts,
      strongest_subject: strongestSubject,
      weakest_subject: weakestSubject,
    };

    // Generate AI insights if there's enough data
    let aiInsights: string | null = null;
    
    if (chapterStats.length >= 2 && totalAttempts >= 10) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (LOVABLE_API_KEY) {
        const weakChapters = chapterStats.slice(0, 3);
        const strongChapters = chapterStats.slice(-3).reverse();
        const decliningChapters = chapterStats.filter(c => c.trend === "declining");
        const improvingChapters = chapterStats.filter(c => c.trend === "improving");

        const prompt = `You are a friendly study coach for Indian students preparing for exams. Analyze this student's MCQ practice data and provide 3-4 personalized, actionable insights. Be encouraging but honest. Use emojis sparingly.

Student Data:
- Overall accuracy: ${performanceData.overall_accuracy}%
- Total questions attempted: ${totalAttempts}
- Weakest chapters: ${weakChapters.map(c => `${c.chapter_name} (${c.accuracy}%)`).join(", ")}
- Strongest chapters: ${strongChapters.map(c => `${c.chapter_name} (${c.accuracy}%)`).join(", ")}
- Declining performance in: ${decliningChapters.length > 0 ? decliningChapters.map(c => c.chapter_name).join(", ") : "none"}
- Improving in: ${improvingChapters.length > 0 ? improvingChapters.map(c => c.chapter_name).join(", ") : "none"}
- Strongest subject: ${strongestSubject || "not enough data"}
- Weakest subject: ${weakestSubject || "not enough data"}

Provide insights in this format:
1. [Priority Focus] - What they should focus on most urgently
2. [Momentum] - What's going well or improving
3. [Strategy Tip] - A specific study technique recommendation
4. [Quick Win] - Something easy they can do today

Keep it concise (max 150 words total), conversational, and student-friendly.`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "user", content: prompt }
              ],
              max_tokens: 500,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiInsights = aiData.choices?.[0]?.message?.content || null;
          } else if (aiResponse.status === 429) {
            console.log("AI rate limited, skipping insights");
          } else if (aiResponse.status === 402) {
            console.log("AI credits exhausted, skipping insights");
          }
        } catch (aiError) {
          console.error("AI generation error:", aiError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        performance: performanceData,
        insights: aiInsights,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-performance:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
