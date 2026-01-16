import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to call backup Google Gemini API
async function callGeminiBackup(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string | null; error: string | null; status?: number }> {
  const GOOGLE_GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');

  if (!GOOGLE_GEMINI_API_KEY) {
    return { content: null, error: 'No backup AI configured (GOOGLE_GEMINI_API_KEY not set)' };
  }

  const candidates: Array<{ version: 'v1' | 'v1beta'; model: string }> = [
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1', model: 'gemini-1.5-flash-latest' },
    { version: 'v1beta', model: 'gemini-2.0-flash' },
  ];

  const extractErrMessage = async (resp: Response) => {
    const text = await resp.text().catch(() => '');
    try {
      const parsed = JSON.parse(text);
      const msg = parsed?.error?.message || parsed?.message;
      return (msg || text || 'Unknown error').toString().slice(0, 300);
    } catch {
      return (text || 'Unknown error').toString().slice(0, 300);
    }
  };

  console.log('Attempting backup AI provider (Google Gemini)...');

  for (const c of candidates) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${c.version}/models/${c.model}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
          }),
        }
      );

      if (!response.ok) {
        const msg = await extractErrMessage(response);
        console.error(`Gemini backup error (${c.version}/${c.model}):`, response.status, msg);
        if (response.status === 404) continue;
        if (response.status === 429) continue;
        return { content: null, error: `Gemini API ${response.status}: ${msg}`, status: response.status };
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        return { content: null, error: `No content in Gemini response (${c.model})` };
      }

      console.log(`Backup AI (Gemini) responded successfully via ${c.version}/${c.model}`);
      return { content, error: null };
    } catch (err) {
      console.error(`Gemini backup exception (${c.version}/${c.model}):`, err);
      continue;
    }
  }

  return { content: null, error: 'Backup AI provider failed (no usable Gemini model/quota)' };
}

// Helper to call AI with automatic fallback
async function callAIWithFallback(systemPrompt: string, userPrompt: string): Promise<{ content: string | null; provider: string; error: string | null }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // Try Lovable AI first
  if (LOVABLE_API_KEY) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return { content, provider: 'lovable', error: null };
        }
      } else if (response.status === 402 || response.status === 429) {
        console.log(`Lovable AI unavailable (${response.status}), trying backup...`);
        const backup = await callGeminiBackup(systemPrompt, userPrompt);
        if (backup.content) {
          return { content: backup.content, provider: 'gemini-backup', error: null };
        }
        return { content: null, provider: 'none', error: backup.error || 'Backup failed' };
      } else {
        console.error('Lovable AI error:', response.status);
        // Try backup for other errors too
        const backup = await callGeminiBackup(systemPrompt, userPrompt);
        if (backup.content) {
          return { content: backup.content, provider: 'gemini-backup', error: null };
        }
        return { content: null, provider: 'none', error: `AI error: ${response.status}` };
      }
    } catch (err) {
      console.error('Lovable AI exception:', err);
      // Try backup on network errors
      const backup = await callGeminiBackup(systemPrompt, userPrompt);
      if (backup.content) {
        return { content: backup.content, provider: 'gemini-backup', error: null };
      }
      return { content: null, provider: 'none', error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  // No Lovable API key, try backup directly
  const backup = await callGeminiBackup(systemPrompt, userPrompt);
  if (backup.content) {
    return { content: backup.content, provider: 'gemini-backup', error: null };
  }
  return { content: null, provider: 'none', error: 'No AI provider configured' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Parse request body for optional parameters
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 3; // Number of chapters to process at once
    const questionsPerChapter = body.questionsPerChapter || 10;
    const minThreshold = body.minThreshold || 10; // Only generate for chapters with fewer than this

    // Find chapters that need questions
    const { data: chaptersNeedingQuestions, error: fetchError } = await supabaseAdmin
      .from('chapters')
      .select(`
        id,
        name,
        subjects(name)
      `)
      .order('subject_id')
      .order('display_order');

    if (fetchError) {
      throw new Error(`Failed to fetch chapters: ${fetchError.message}`);
    }

    // Get question counts per chapter
    const { data: questionCounts, error: countError } = await supabaseAdmin
      .rpc('get_chapter_question_counts');

    // If RPC doesn't exist, fall back to manual counting
    let chapterQuestionMap: Record<string, number> = {};
    
    if (countError) {
      // Fallback: Get counts manually
      const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('chapter_id')
        .eq('status', 'active');

      if (questions) {
        questions.forEach((q: any) => {
          chapterQuestionMap[q.chapter_id] = (chapterQuestionMap[q.chapter_id] || 0) + 1;
        });
      }
    } else if (questionCounts) {
      questionCounts.forEach((c: any) => {
        chapterQuestionMap[c.chapter_id] = c.count;
      });
    }

    // Filter to chapters needing questions
    const chaptersToProcess = chaptersNeedingQuestions
      .filter((c: any) => (chapterQuestionMap[c.id] || 0) < minThreshold)
      .slice(0, batchSize);

    if (chaptersToProcess.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'All chapters have sufficient questions',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${chaptersToProcess.length} chapters...`);

    const results: any[] = [];

    const systemPrompt = `You are an expert CBSE Class 12 teacher. Generate 100% factually accurate MCQs based on NCERT textbooks.

RULES:
- Double-check every answer
- Use only verified NCERT facts
- correct_answer uses 1=A, 2=B, 3=C, 4=D

MATH FORMATTING:
- Use LaTeX: $\\frac{1}{2}$, $x^2$, $\\sqrt{x}$
- For fractions: $\\frac{num}{den}$
- Greek letters: $\\alpha$, $\\beta$, $\\pi$`;

    // Process chapters sequentially to avoid rate limits
    for (const chapter of chaptersToProcess) {
      const subjectName = (chapter.subjects as any)?.name || 'General';
      const currentCount = chapterQuestionMap[chapter.id] || 0;
      const neededCount = Math.max(0, questionsPerChapter - currentCount);

      if (neededCount === 0) continue;

      console.log(`Generating ${neededCount} questions for ${subjectName} - ${chapter.name}`);

      const userPrompt = `Generate exactly ${neededCount} MCQ questions for CBSE Class 12 ${subjectName}, chapter: "${chapter.name}".

Return ONLY a valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), explanation.`;

      try {
        const aiResult = await callAIWithFallback(systemPrompt, userPrompt);

        if (!aiResult.content) {
          results.push({ chapter: chapter.name, status: 'error', error: aiResult.error || 'No AI response' });
          continue;
        }

        console.log(`AI response received via ${aiResult.provider} for ${chapter.name}`);

        // Parse JSON with backslash fixing
        let questions;
        try {
          const jsonMatch = aiResult.content.match(/\[[\s\S]*\]/);
          let jsonStr = jsonMatch ? jsonMatch[0] : aiResult.content;
          jsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
          questions = JSON.parse(jsonStr);
        } catch (parseError) {
          // Fallback parsing
          try {
            let jsonStr = aiResult.content.match(/\[[\s\S]*\]/)?.[0] || aiResult.content;
            jsonStr = jsonStr
              .replace(/\\\\/g, '<<<DB>>>')
              .replace(/\\/g, '\\\\')
              .replace(/<<<DB>>>/g, '\\\\');
            questions = JSON.parse(jsonStr);
          } catch {
            results.push({ chapter: chapter.name, status: 'error', error: 'JSON parse failed' });
            continue;
          }
        }

        if (!Array.isArray(questions) || questions.length === 0) {
          results.push({ chapter: chapter.name, status: 'error', error: 'Invalid questions array' });
          continue;
        }

        // Validate and insert
        const toInsert = questions.map((q: any, index: number) => {
          const aiAnswer = Number(q.correct_answer) || 1;
          return {
            chapter_id: chapter.id,
            text: q.text || `Question ${index + 1}`,
            option_a: q.option_a || 'Option A',
            option_b: q.option_b || 'Option B',
            option_c: q.option_c || 'Option C',
            option_d: q.option_d || 'Option D',
            correct_answer: Math.max(0, Math.min(3, aiAnswer - 1)),
            explanation: q.explanation || null,
            source: 'ai',
            status: 'active',
          };
        });

        const { error: insertError } = await supabaseAdmin
          .from('questions')
          .insert(toInsert);

        if (insertError) {
          results.push({ chapter: chapter.name, status: 'error', error: insertError.message });
        } else {
          results.push({ chapter: chapter.name, status: 'success', generated: toInsert.length, provider: aiResult.provider });
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`Error processing ${chapter.name}:`, err);
        results.push({ chapter: chapter.name, status: 'error', error: String(err) });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const totalGenerated = results.reduce((sum, r) => sum + (r.generated || 0), 0);

    return new Response(
      JSON.stringify({
        message: `Processed ${chaptersToProcess.length} chapters`,
        successCount,
        totalGenerated,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pregenerate-questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
