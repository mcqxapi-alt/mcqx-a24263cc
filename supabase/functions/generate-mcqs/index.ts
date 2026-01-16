import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
    // Prefer stable API + model (if key supports it)
    { version: 'v1', model: 'gemini-1.5-flash' },
    { version: 'v1', model: 'gemini-1.5-flash-latest' },
    // Newer models (often v1beta)
    { version: 'v1beta', model: 'gemini-2.5-flash' },
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

  let lastError: { status: number; msg: string; candidate: string } | null = null;

  for (const c of candidates) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${c.version}/models/${c.model}:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `SYSTEM:\n${systemPrompt}\n\nUSER:\n${userPrompt}` }],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const msg = await extractErrMessage(response);
        const candidateId = `${c.version}/${c.model}`;
        lastError = { status: response.status, msg, candidate: candidateId };
        console.error(`Gemini backup error (${candidateId}):`, response.status, msg);

        // If model isn't found, try the next candidate.
        if (response.status === 404) continue;

        // For quota/rate errors, try next model (quota can be per-model).
        if (response.status === 429) continue;

        return { content: null, error: `Gemini ${response.status} (${candidateId}): ${msg}`, status: response.status };
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
      // Try next candidate on network exceptions
      continue;
    }
  }

  if (lastError) {
    return {
      content: null,
      error: `Backup Gemini failed: ${lastError.status} (${lastError.candidate}): ${lastError.msg}. Check API key type + billing/quota.`,
      status: lastError.status,
    };
  }

  return { content: null, error: 'Backup AI provider failed (no usable Gemini model/quota)' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterId, chapterName, subjectName, count = 5 } = await req.json();

    if (!chapterId || typeof chapterId !== 'string' || !isUuid(chapterId)) {
      return new Response(
        JSON.stringify({ error: 'chapterId (uuid) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!chapterName || !subjectName) {
      return new Response(
        JSON.stringify({ error: 'chapterName and subjectName are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    console.log(`Generating ${count} MCQs for ${subjectName} - ${chapterName}`);

    const systemPrompt = `You are an expert CBSE Class 12 teacher with 20+ years of experience. You MUST generate 100% factually accurate MCQs based on NCERT textbooks.

CRITICAL RULES:
- Double-check every answer before responding
- The correct_answer field MUST match the actually correct option
- Use only verified facts from NCERT Class 12 curriculum
- If unsure about any fact, use simpler well-known concepts
- Explanations must clearly justify why the answer is correct

MATH FORMATTING RULES (IMPORTANT):
- Use LaTeX notation wrapped in single dollar signs for inline math: $\\frac{1}{2}$, $x^2$, $\\sqrt{x}$
- Use double dollar signs for display/block math: $$\\int_0^1 x^2 dx$$
- For fractions use: $\\frac{numerator}{denominator}$
- For integrals use: $\\int$, $\\int_a^b$, $\\iint$, $\\oint$
- For limits use: $\\lim_{x \\to a}$
- For matrices use: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$
- For square roots use: $\\sqrt{x}$, $\\sqrt[n]{x}$
- For Greek letters use: $\\alpha$, $\\beta$, $\\theta$, $\\pi$, etc.
- For trigonometry use: $\\sin$, $\\cos$, $\\tan$, etc.
- For summation/product use: $\\sum_{i=1}^{n}$, $\\prod_{i=1}^{n}$
- Keep text outside math expressions plain (no Markdown)`;

    const userPrompt = `Generate exactly ${count} MCQ questions for CBSE Class 12 ${subjectName}, chapter: "${chapterName}".

IMPORTANT: Verify each answer is 100% correct before including it. Use only NCERT-verified facts.

For each question:
1. Question text (clear, unambiguous, use LaTeX for math: $...$)
2. Four distinct options (A, B, C, D) - only ONE should be correct
3. The correct answer number (1=A, 2=B, 3=C, 4=D)
4. Explanation proving why the answer is correct (use LaTeX for math)

VERIFY: Before outputting, mentally solve each question to confirm the correct_answer matches the right option.

Return ONLY a valid JSON array:
[
  {
    "text": "Find the value of $\\\\frac{d}{dx}(x^2)$",
    "option_a": "$2x$",
    "option_b": "$x^2$",
    "option_c": "$2$",
    "option_d": "$x$",
    "correct_answer": 1,
    "explanation": "Using the power rule, $\\\\frac{d}{dx}(x^n) = nx^{n-1}$, so $\\\\frac{d}{dx}(x^2) = 2x$"
  }
]`;

    let content: string | null = null;
    let usedProvider = 'lovable';

    // Try Lovable AI first
    if (LOVABLE_API_KEY) {
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
        content = data.choices?.[0]?.message?.content;
        console.log('Using Lovable AI Gateway');
      } else if (response.status === 402 || response.status === 429) {
        // Credits exhausted or rate limited - try backup
        console.log(`Lovable AI unavailable (${response.status}), trying backup...`);
        const backup = await callGeminiBackup(systemPrompt, userPrompt);
        if (backup.content) {
          content = backup.content;
          usedProvider = 'gemini-backup';
        } else {
          const baseMsg = response.status === 402
            ? 'AI credits exhausted.'
            : 'AI rate limit exceeded.';
          return new Response(
            JSON.stringify({ error: `${baseMsg} Backup provider failed: ${backup.error || 'unknown error'}` }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error(`AI gateway returned ${response.status}`);
      }
    } else {
      // No Lovable API key, try backup directly
      console.log('No LOVABLE_API_KEY, trying backup...');
      const backup = await callGeminiBackup(systemPrompt, userPrompt);
      if (backup.content) {
        content = backup.content;
        usedProvider = 'gemini-backup';
      } else {
        throw new Error(`No AI provider configured: ${backup.error || 'unknown error'}`);
      }
    }

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log(`Raw AI response (${usedProvider}):`, content.substring(0, 200) + '...');

    // Parse the JSON from the response
    let questions;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      let jsonStr = jsonMatch ? jsonMatch[0] : content;
      
      // Fix common JSON issues with LaTeX backslashes
      jsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      
      questions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback: try a more aggressive cleanup
      try {
        let jsonStr = content.match(/\[[\s\S]*\]/)?.[0] || content;
        jsonStr = jsonStr
          .replace(/\\\\/g, '<<<DOUBLE_BACKSLASH>>>')
          .replace(/\\/g, '\\\\')
          .replace(/<<<DOUBLE_BACKSLASH>>>/g, '\\\\');
        questions = JSON.parse(jsonStr);
      } catch (fallbackError) {
        console.error('Fallback parse also failed:', fallbackError);
        throw new Error('Failed to parse AI-generated questions');
      }
    }

    // Validate the structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from AI');
    }

    // Ensure each question has required fields
    // AI returns 1-indexed correct_answer (1=A, 2=B, 3=C, 4=D)
    // Database expects 0-indexed (0=A, 1=B, 2=C, 3=D)
    const validatedQuestions = questions.map((q: any, index: number) => {
      const aiAnswer = Number(q.correct_answer) || 1;
      // Convert from 1-indexed to 0-indexed, clamping to valid range
      const correctAnswer = Math.max(0, Math.min(3, aiAnswer - 1));
      
      return {
        text: q.text || `Question ${index + 1}`,
        option_a: q.option_a || 'Option A',
        option_b: q.option_b || 'Option B',
        option_c: q.option_c || 'Option C',
        option_d: q.option_d || 'Option D',
        correct_answer: correctAnswer,
        explanation: q.explanation || 'No explanation provided',
        source: 'ai' as const
      };
    });

    console.log(`Successfully generated ${validatedQuestions.length} questions via ${usedProvider}`);

    // Persist questions to DB so the client can fetch them without ever receiving correct_answer.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Backend is not configured');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const toInsert = validatedQuestions.map((q) => ({
      chapter_id: chapterId,
      text: q.text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      source: 'ai',
      status: 'active',
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('questions')
      .insert(toInsert)
      .select('id, chapter_id, text, option_a, option_b, option_c, option_d, source, status, created_at, updated_at');

    if (insertError) {
      console.error('Failed to insert questions:', insertError);
      throw new Error('Failed to save generated questions');
    }

    return new Response(
      JSON.stringify({ questions: inserted ?? [], provider: usedProvider }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-mcqs:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
