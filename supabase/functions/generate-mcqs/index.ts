import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Generating ${count} MCQs for ${subjectName} - ${chapterName}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert CBSE Class 12 teacher with 20+ years of experience. You MUST generate 100% factually accurate MCQs based on NCERT textbooks.

CRITICAL RULES:
- Double-check every answer before responding
- The correct_answer field MUST match the actually correct option
- Use only verified facts from NCERT Class 12 curriculum
- If unsure about any fact, use simpler well-known concepts
- Explanations must clearly justify why the answer is correct

FORMATTING RULES:
- Do NOT use Markdown (no **bold**, no bullets that rely on Markdown)
- Keep math notation readable in plain text (use x^2 or x^(2), e^(ax), sin(2x), integral symbols like ∫ are OK)
- Avoid weird typographic substitutions; keep symbols consistent`
          },
          {
            role: 'user',
            content: `Generate exactly ${count} MCQ questions for CBSE Class 12 ${subjectName}, chapter: "${chapterName}".

IMPORTANT: Verify each answer is 100% correct before including it. Use only NCERT-verified facts.

For each question:
1. Question text (clear, unambiguous)
2. Four distinct options (A, B, C, D) - only ONE should be correct
3. The correct answer number (1=A, 2=B, 3=C, 4=D)
4. Explanation proving why the answer is correct

VERIFY: Before outputting, mentally solve each question to confirm the correct_answer matches the right option.

Return ONLY a valid JSON array:
[
  {
    "text": "Question text here?",
    "option_a": "Option A",
    "option_b": "Option B",
    "option_c": "Option C",
    "option_d": "Option D",
    "correct_answer": 1,
    "explanation": "Clear explanation proving this is correct"
  }
]`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content);

    // Parse the JSON from the response
    let questions;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI-generated questions');
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

    console.log(`Successfully generated ${validatedQuestions.length} questions`);

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
      JSON.stringify({ questions: inserted ?? [] }),
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
