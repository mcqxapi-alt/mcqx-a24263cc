import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapterName, subjectName, count = 5 } = await req.json();
    
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
            content: `You are an expert CBSE Class 12 teacher. Generate high-quality multiple choice questions for students preparing for board exams. Questions should be clear, accurate, and test conceptual understanding.`
          },
          {
            role: 'user',
            content: `Generate exactly ${count} MCQ questions for CBSE Class 12 ${subjectName}, chapter: "${chapterName}".

For each question provide:
1. The question text
2. Four options (A, B, C, D)
3. The correct answer (as a number: 1 for A, 2 for B, 3 for C, 4 for D)
4. A brief explanation of why the answer is correct

Return ONLY a valid JSON array with this exact structure, no other text:
[
  {
    "text": "Question text here?",
    "option_a": "Option A text",
    "option_b": "Option B text", 
    "option_c": "Option C text",
    "option_d": "Option D text",
    "correct_answer": 1,
    "explanation": "Brief explanation here"
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
    const validatedQuestions = questions.map((q: any, index: number) => ({
      text: q.text || `Question ${index + 1}`,
      option_a: q.option_a || 'Option A',
      option_b: q.option_b || 'Option B',
      option_c: q.option_c || 'Option C',
      option_d: q.option_d || 'Option D',
      correct_answer: Number(q.correct_answer) || 1,
      explanation: q.explanation || 'No explanation provided',
      source: 'ai' as const
    }));

    console.log(`Successfully generated ${validatedQuestions.length} questions`);

    return new Response(
      JSON.stringify({ questions: validatedQuestions }),
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
