import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Quality validation for generated questions
function validateQuestionQuality(q: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for minimum text length
  if (!q.text || q.text.length < 15) {
    issues.push('Question text too short');
  }
  
  // Check all options are unique
  const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
  const uniqueOptions = new Set(options.map((o: string) => o.toLowerCase().trim()));
  if (uniqueOptions.size < 4) {
    issues.push('Duplicate or missing options');
  }
  
  // Check options aren't too similar in length (sign of lazy generation)
  const optionLengths = options.map((o: string) => o.length);
  const avgLength = optionLengths.reduce((a, b) => a + b, 0) / 4;
  const allSameLength = optionLengths.every(l => Math.abs(l - avgLength) < 3);
  if (allSameLength && avgLength < 20) {
    issues.push('Options suspiciously similar in length');
  }
  
  // Check correct answer is valid
  const correctAnswer = Number(q.correct_answer);
  if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
    issues.push('Invalid correct_answer value');
  }
  
  // Check explanation exists and is meaningful
  if (!q.explanation || q.explanation.length < 20) {
    issues.push('Explanation too short or missing');
  }
  
  // Check for "Option A/B/C/D" placeholder text
  if (options.some((o: string) => /^Option [A-D]$/i.test(o.trim()))) {
    issues.push('Contains placeholder option text');
  }
  
  // Check question doesn't contain the answer directly
  const correctOption = options[correctAnswer - 1];
  if (correctOption && q.text.toLowerCase().includes(correctOption.toLowerCase()) && correctOption.length > 10) {
    issues.push('Question contains answer text');
  }
  
  return { valid: issues.length === 0, issues };
}

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
        if (response.status === 404) continue;
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

// Subject-specific quality guidelines
function getSubjectGuidelines(subjectName: string): string {
  const subject = subjectName.toLowerCase();
  
  if (subject.includes('math') || subject.includes('mathematics')) {
    return `
MATHEMATICS-SPECIFIC RULES:
- Include multi-step problems that test conceptual understanding, not just formula recall
- Use varied numerical values to prevent pattern-matching
- Include "None of these" only when genuinely applicable
- Test common misconceptions as distractors (e.g., forgetting negative solutions)
- Problems should require 2-4 steps to solve
- Include application-based problems from real-world contexts`;
  }
  
  if (subject.includes('physics')) {
    return `
PHYSICS-SPECIFIC RULES:
- Include numerical problems with proper SI units
- Test conceptual understanding alongside calculations
- Use diagrams conceptually described in text when helpful
- Distractors should represent common calculation errors or misconceptions
- Include problems requiring dimensional analysis
- Mix theoretical concepts with practical applications`;
  }
  
  if (subject.includes('chemistry')) {
    return `
CHEMISTRY-SPECIFIC RULES:
- Include reaction mechanisms and equation balancing
- Test IUPAC nomenclature rigorously
- Include numerical problems (molarity, stoichiometry, etc.)
- Periodic trends should be tested with specific examples
- Include organic reaction conditions and reagents
- Test both structural and molecular formulas`;
  }
  
  if (subject.includes('biology')) {
    return `
BIOLOGY-SPECIFIC RULES:
- Test process sequences (e.g., stages of mitosis, Krebs cycle)
- Include scientific nomenclature with italics indicated
- Diagram-based conceptual questions
- Connect structure to function in explanations
- Include recent developments in genetics/biotechnology
- Test classification and taxonomy accurately`;
  }
  
  if (subject.includes('account') || subject.includes('commerce') || subject.includes('business')) {
    return `
COMMERCE/ACCOUNTS-SPECIFIC RULES:
- Include numerical problems with journal entries
- Test accounting standards and principles
- Use realistic business scenarios
- Include ratio analysis and interpretation
- Test legal provisions related to business
- Balance conceptual and computational questions`;
  }
  
  if (subject.includes('economics')) {
    return `
ECONOMICS-SPECIFIC RULES:
- Include graph-based conceptual questions
- Test both micro and macroeconomic principles
- Use current economic scenarios where applicable
- Include numerical problems (national income, elasticity)
- Test cause-effect relationships in economic phenomena
- Include policy-based application questions`;
  }
  
  if (subject.includes('history') || subject.includes('political')) {
    return `
HISTORY/POLITY-SPECIFIC RULES:
- Include cause-effect and timeline-based questions
- Test constitutional provisions with article numbers
- Include source-based inference questions
- Distractors should be plausible historical alternatives
- Test both factual recall and analytical understanding
- Include maps and chronology conceptually`;
  }
  
  if (subject.includes('english') || subject.includes('literature')) {
    return `
ENGLISH/LITERATURE-SPECIFIC RULES:
- Include passage-based inference questions
- Test literary devices with textual examples
- Grammar questions should test common errors
- Include vocabulary in context
- Test comprehension, interpretation, and analysis
- Include questions on tone, style, and author's purpose`;
  }
  
  return `
GENERAL QUALITY RULES:
- Questions must test understanding, not just memorization
- Include application-based scenarios
- Distractors must be plausible but clearly incorrect
- Vary difficulty across cognitive levels`;
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

    console.log(`Generating ${count} HIGH-QUALITY MCQs for ${subjectName} - ${chapterName}`);

    const isGerman = subjectName.toLowerCase() === 'german';
    const subjectGuidelines = getSubjectGuidelines(subjectName);
    
    const germanSystemPrompt = `You are India's TOP CBSE Class 12 German language examiner with 25+ years experience setting board exam papers.

YOUR MISSION: Create EXAM-READY questions that would genuinely appear in CBSE Class 12 German board exams.

QUALITY STANDARDS (NON-NEGOTIABLE):
✓ Every question MUST test a specific grammar rule with practical application
✓ Distractors must represent REAL student errors (not random wrong answers)
✓ Questions must be at the EXACT difficulty level of CBSE board exams
✓ TRIPLE-CHECK: The correct_answer MUST be verified against grammar rules

DISTRACTOR DESIGN PRINCIPLES:
- Option A: Correct answer OR most common student error
- Option B: Error in verb conjugation or tense
- Option C: Error in case (Akkusativ vs Dativ) or word order
- Option D: Error in article or adjective ending

TOPIC-SPECIFIC GUIDELINES:
- Passive Voice: Focus on Passiv Präsens (wird + Partizip II) and Passiv Präteritum (wurde + Partizip II)
- Subordinate Clauses: als ob, da, falls, sodass, statt dass with verb-final position
- Adjective as Nouns: der/die + Adjective with correct declension
- Future Tense: werden + Infinitiv with correct werden conjugation
- Pronouns: Akkusativ vs Dativ pronouns in context

CRITICAL: ALL EXPLANATIONS MUST BE IN ENGLISH with the grammar rule clearly stated.`;

    const germanUserPrompt = `Generate exactly ${count} BOARD-EXAM-QUALITY MCQs for CBSE Class 12 German, topic: "${chapterName}".

DIFFICULTY DISTRIBUTION (MANDATORY):
- ${Math.ceil(count * 0.3)} questions: "easy" - Basic grammar identification, simple fill-in-the-blank
- ${Math.ceil(count * 0.4)} questions: "medium" - Apply grammar rules in new contexts
- ${Math.floor(count * 0.3)} questions: "hard" - Complex transformations, multiple grammar rules combined

QUALITY CHECKLIST (verify each question):
□ Tests a SPECIFIC grammar rule (name it in explanation)
□ Only ONE answer is grammatically correct
□ Distractors represent REAL student mistakes
□ Explanation in ENGLISH cites the exact grammar rule
□ Difficulty field MUST be one of: "easy", "medium", "hard"

Return ONLY valid JSON array:
[
  {
    "text": "Complete the sentence: 'Wenn ich reich _____, würde ich ein Haus kaufen.'",
    "option_a": "wäre",
    "option_b": "bin",
    "option_c": "war",
    "option_d": "sei",
    "correct_answer": 1,
    "difficulty": "medium",
    "explanation": "Konjunktiv II is required for unreal conditions. 'Wäre' is the Konjunktiv II form of 'sein'."
  }
]`;

    const defaultSystemPrompt = `You are India's PREMIER CBSE Class 12 question paper setter with 25+ years experience. You have set questions for CBSE board exams that 1.5 million students attempt annually.

YOUR MISSION: Create GENUINELY USEFUL MCQs that will help students MASTER the concepts and ACE their exams.

QUALITY STANDARDS (NON-NEGOTIABLE):
✓ 100% FACTUAL ACCURACY - verify every fact against NCERT textbooks
✓ EXAM-ALIGNED - match exact difficulty and style of CBSE board questions
✓ CONCEPTUAL DEPTH - test understanding, not rote memorization
✓ DISTRACTOR EXCELLENCE - wrong options must represent real student misconceptions

BLOOM'S TAXONOMY DISTRIBUTION:
- 20% Remember: Direct recall of key facts, formulas, definitions
- 30% Understand: Explain concepts, interpret data, compare ideas  
- 30% Apply: Use knowledge in new situations, solve problems
- 20% Analyze: Break down complex ideas, identify relationships

DISTRACTOR DESIGN PRINCIPLES:
Your wrong options must be PLAUSIBLE. Use these techniques:
1. COMMON ERRORS: Options that result from typical calculation mistakes
2. PARTIAL KNOWLEDGE: Options that would seem correct with incomplete understanding
3. CONCEPT CONFUSION: Options mixing up related but different concepts
4. SIGN/UNIT ERRORS: In numerical problems, include sign or unit mistakes

${subjectGuidelines}

MATH FORMATTING (CRITICAL):
- Inline math: $\\frac{1}{2}$, $x^2$, $\\sqrt{x}$, $\\int_0^1 f(x)dx$
- Display math for complex expressions: $$\\sum_{i=1}^{n} i^2$$
- Use proper LaTeX: \\sin, \\cos, \\log, \\ln, \\lim, \\infty
- Greek: $\\alpha$, $\\beta$, $\\theta$, $\\pi$, $\\omega$
- Matrices: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$

EXPLANATION REQUIREMENTS:
- Start with the correct answer and WHY it's correct
- Explain the concept/formula/rule being tested
- Address why each distractor is wrong (briefly)
- Include the solution steps for numerical problems`;

    const defaultUserPrompt = `Generate exactly ${count} BOARD-EXAM-QUALITY MCQs for CBSE Class 12 ${subjectName}, chapter: "${chapterName}".

DIFFICULTY DISTRIBUTION (MANDATORY - include "difficulty" field in EVERY question):
- ${Math.ceil(count * 0.3)} questions: "easy" - Direct recall, simple application, single-step problems
- ${Math.ceil(count * 0.4)} questions: "medium" - Multi-step problems, conceptual understanding required
- ${Math.floor(count * 0.3)} questions: "hard" - Complex analysis, multiple concepts combined, challenging calculations

QUALITY CHECKLIST (verify EACH question before including):
□ Fact-checked against NCERT Class 12 curriculum
□ Tests conceptual understanding (not just memorization)
□ Exactly ONE correct answer among four distinct options
□ All distractors are plausible (represent real student errors)
□ Difficulty field MUST be one of: "easy", "medium", "hard"
□ Explanation teaches the concept thoroughly

CRITICAL VERIFICATION STEPS:
1. Solve each problem yourself before outputting
2. Verify the correct_answer matches your solution
3. Ensure difficulty matches the actual complexity

Return ONLY valid JSON array:
[
  {
    "text": "If $f(x) = x^3 - 6x^2 + 11x - 6$, find the sum of all roots.",
    "option_a": "6",
    "option_b": "11",
    "option_c": "-6",
    "option_d": "1",
    "correct_answer": 1,
    "difficulty": "medium",
    "explanation": "By Vieta's formulas, sum of roots = $-b/a = 6$."
  }
]`;

    const systemPrompt = isGerman ? germanSystemPrompt : defaultSystemPrompt;
    const userPrompt = isGerman ? germanUserPrompt : defaultUserPrompt;

    let content: string | null = null;
    let usedProvider = 'lovable';

    // Use Gemini 2.5 Pro for highest quality reasoning
    if (LOVABLE_API_KEY) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro', // Upgraded to Pro for better quality
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        content = data.choices?.[0]?.message?.content;
        console.log('Using Lovable AI Gateway (Gemini 2.5 Pro)');
      } else if (response.status === 402 || response.status === 429) {
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

    console.log(`Raw AI response (${usedProvider}):`, content.substring(0, 300) + '...');

    // Parse the JSON from the response
    let questions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      let jsonStr = jsonMatch ? jsonMatch[0] : content;
      jsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      questions = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
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

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from AI');
    }

    // Validate and filter questions for quality
    const validatedQuestions: any[] = [];
    const rejectedQuestions: any[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const validation = validateQuestionQuality(q);
      
      if (validation.valid) {
        const aiAnswer = Number(q.correct_answer) || 1;
        const correctAnswer = Math.max(0, Math.min(3, aiAnswer - 1));
        
        // Validate and normalize difficulty
        const validDifficulties = ['easy', 'medium', 'hard'];
        const difficulty = validDifficulties.includes(q.difficulty?.toLowerCase()) 
          ? q.difficulty.toLowerCase() 
          : 'medium'; // Default to medium if not specified
        
        validatedQuestions.push({
          text: q.text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: correctAnswer,
          difficulty: difficulty,
          explanation: q.explanation,
          source: 'ai' as const
        });
      } else {
        console.warn(`Question ${i + 1} rejected:`, validation.issues);
        rejectedQuestions.push({ question: q, issues: validation.issues });
      }
    }

    console.log(`Quality filter: ${validatedQuestions.length} passed, ${rejectedQuestions.length} rejected`);

    if (validatedQuestions.length === 0) {
      throw new Error('All generated questions failed quality validation');
    }

    // Persist questions to DB
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
      difficulty: q.difficulty,
      explanation: q.explanation,
      source: 'ai',
      status: 'active',
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('questions')
      .insert(toInsert)
      .select('id, chapter_id, text, option_a, option_b, option_c, option_d, source, status, difficulty, created_at, updated_at');

    if (insertError) {
      console.error('Failed to insert questions:', insertError);
      throw new Error('Failed to save generated questions');
    }

    console.log(`Successfully generated ${inserted?.length || 0} HIGH-QUALITY questions via ${usedProvider}`);

    return new Response(
      JSON.stringify({ 
        questions: inserted ?? [], 
        provider: usedProvider,
        quality: {
          generated: questions.length,
          passed: validatedQuestions.length,
          rejected: rejectedQuestions.length
        }
      }),
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
