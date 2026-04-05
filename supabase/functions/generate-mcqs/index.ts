import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

// Quality validation for generated questions
function validateQuestionQuality(
  q: any,
  subjectName: string
): { valid: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for minimum text length
  if (!q.text || q.text.length < 15) {
    issues.push('Question text too short');
  }

  // Check all options are unique and present
  const options = [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean);
  const uniqueOptions = new Set(options.map((o: string) => o.toLowerCase().trim()));
  if (options.length < 4 || uniqueOptions.size < 4) {
    issues.push('Duplicate or missing options');
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

  // For language/grammar subjects, short similarly sized options are expected (e.g., pronouns)
  // Keep this as a warning only so valid grammar MCQs are not incorrectly rejected.
  const isLanguageSubject = /(german|english|literature|language|grammar)/i.test(subjectName);
  const optionLengths = options.map((o: string) => o.length);
  if (optionLengths.length === 4) {
    const avgLength = optionLengths.reduce((a, b) => a + b, 0) / 4;
    const allSameLength = optionLengths.every((l) => Math.abs(l - avgLength) < 3);
    if (allSameLength && avgLength < 20) {
      if (isLanguageSubject) {
        warnings.push('Options are similarly sized (expected for grammar-style questions)');
      } else {
        warnings.push('Options suspiciously similar in length');
      }
    }
  }

  // Check question doesn't contain the answer directly
  const correctOption = options[correctAnswer - 1];
  if (
    correctOption &&
    q.text.toLowerCase().includes(correctOption.toLowerCase()) &&
    correctOption.length > 10
  ) {
    issues.push('Question contains answer text');
  }

  return { valid: issues.length === 0, issues, warnings };
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
  
  if (subject.includes('cuet') && subject.includes('english')) {
    return `
CUET ENGLISH-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- This is a LANGUAGE PROFICIENCY test, NOT literature
- Test reading comprehension, grammar, vocabulary, idioms, and sentence structure
- NO questions about novels, poems, stories, or NCERT textbook chapters
- Questions must match NTA CUET-UG difficulty level
- Include passage-based questions for reading comprehension topics
- Grammar questions must test practical usage, not theoretical definitions`;
  }

  if (subject.includes('english') || subject.includes('literature')) {
    return `
ENGLISH/LITERATURE-SPECIFIC RULES (CBSE CLASS 12):
- EXTRACT-BASED MCQs: Present a short extract (2-4 lines) from the chapter, then ask inference/comprehension questions about it
- LITERARY DEVICES: Test identification of metaphor, simile, alliteration, personification, irony, symbolism WITH textual evidence from the chapter
- CHARACTER ANALYSIS: Test understanding of character traits, motivations, and relationships
- THEME & MESSAGE: Questions on central themes, moral lessons, and author's perspective
- VOCABULARY IN CONTEXT: Test meaning of words/phrases as used in the chapter
- TONE & STYLE: Questions on author's tone, narrative style, and point of view
- FACTUAL RECALL: Key plot points, settings, character names, and events
- All questions MUST be based on the specific chapter content from NCERT Flamingo/Vistas textbooks
- Distractors must be plausible interpretations that a student might confuse`;
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

    const subjectLower = subjectName.toLowerCase();
    const isGerman = subjectLower === 'german';
    const isCuet = subjectLower.includes('cuet');
    const isCuetEnglish = isCuet && subjectLower.includes('english');
    const isCuetPhysics = isCuet && subjectLower.includes('physics');
    const isCuetChemistry = isCuet && subjectLower.includes('chemistry');
    const isCuetMath = isCuet && (subjectLower.includes('math') || subjectLower.includes('mathematics'));
    const isCuetSubject = isCuetEnglish || isCuetPhysics || isCuetChemistry || isCuetMath;
    const isEnglish = !isCuetEnglish && (subjectLower === 'english' || subjectLower.includes('english'));
    const isEconomics = !isCuet && (subjectLower === 'economics' || subjectLower.includes('economics'));
    const subjectGuidelines = getSubjectGuidelines(subjectName);
    
    const germanSystemPrompt = `You are India's TOP CBSE Class 12 German language examiner with 25+ years experience setting board exam papers.

YOUR MISSION: Create questions that EXACTLY replicate the style and format of CBSE Class 12 German board exam Section C grammar questions.

CBSE BOARD EXAM FORMAT (MANDATORY):
The CBSE German paper uses this EXACT format for grammar questions:
- A German sentence with blanks (______) where students must fill in the correct pronoun, verb form, conjunction, or article
- The instruction line is: "Wähle die richtige Antwort"
- Questions test SUBSTITUTION and TRANSFORMATION of grammatical elements
- Options are short (1-3 German words) representing grammatical choices

TOPIC-SPECIFIC QUESTION STYLES:

Personal Pronouns (Akkusativ/Dativ):
- Give a question sentence, then ask for pronoun replacement with blanks
- Example: "Gibst du Stefanie meine Adresse? – Ja, ich gebe ______ ______."
- Options are pronoun pairs like: "sie, ihr" / "es, ihr" / "ihn, ihr"

Passive Voice (Passiv Präsens/Präteritum):
- Instruction style: "Bilde Sätze im Passiv"
- Give an ACTIVE sentence, then show the passive transformation with blanks for the verb form
- The student must choose the correct auxiliary (werden conjugation) + Partizip II
- Example: "Die Kinder treiben gern Sport. → Gern ______ von den Kindern Sport ______."
- Options: "wird, getrieben" / "werden, getrieben" / "wurde, getrieben" / "werden, treiben"
- Example: "Meine Mutter machte mein Zimmer nicht sauber. → Mein Zimmer ______ von meiner Mutter nicht sauber ______."
- Options: "wurde, gemacht" / "wird, gemacht" / "wurden, gemacht" / "wurde, machen"
- Example: "Der Chef schrieb ihm gestern eine lange E-Mail. → Ihm ______ gestern vom Chef eine lange E-Mail ______."
- Options: "wurde, geschrieben" / "wird, geschrieben" / "wurden, geschrieben" / "wurde, schreiben"
- For Präsens active → Passiv Präsens (wird/werden + Partizip II)
- For Präteritum active → Passiv Präteritum (wurde/wurden + Partizip II)
- Distractors include: wrong auxiliary conjugation, infinitive instead of Partizip II, wrong tense

Subordinate Clauses (Nebensätze/Konjunktionen):
- Instruction style: "Ergänze die Sätze mit Konjunktionen: statt dass, statt...zu, als ob, da, falls, sodass"
- Give a sentence with a blank for the correct conjunction
- The verb goes to the END in subordinate clauses (this is tested implicitly)
- Example: "Ich gehe jetzt schlafen, ______ ich sehr müde bin."
- Options: "da" / "falls" / "sodass" / "als ob"
- Example: "Es scheint so, ______ er sich sehr für dich interessieren würde."
- Options: "als ob" / "da" / "falls" / "statt dass"
- Example: "______ es regnet, bleiben wir zu Hause."
- Options: "Falls" / "Da" / "Sodass" / "Als ob"
- Example: "Mein Bruder sieht die ganze Nacht fern, ______ schlafen."
- Options: "statt zu" / "statt dass" / "da" / "als ob"
- Conjunctions to test: da (because/since), falls (if/in case), sodass (so that), als ob (as if), statt dass / statt...zu (instead of)

Adjectives/Participles as Nouns (Adjektive/Partizipien als Nomen):
- Instruction style: "Ergänze die Adjektive oder Partizip als Nomen"
- Give a sentence with a blank and the base adjective/participle in LOWERCASE parentheses
- The student must choose the correctly declined nominalized form
- Example: "Die ______ (fremd) suchten lange ein Hotel in der Stadt."
- Options: "Fremden" / "Fremde" / "Fremder" / "Fremd"
- Example: "Das ______ (gut) daran ist, dass ihm nichts passiert ist."
- Options: "Gute" / "Guten" / "Guter" / "Gut"
- Example: "Ein ______ (jugendlich) bekommt den ersten Preis."
- Options: "Jugendlicher" / "Jugendliche" / "Jugendlichen" / "Jugendlichem"
- The base word in parentheses MUST always be present in lowercase
- Options test declension based on: gender, case (Nom/Akk/Dat), and article type (definite/indefinite)

Future Tense (Futur I):
- Give a present tense sentence and ask for Futur I transformation
- Example: "Ich lese das Buch. → Ich ______ das Buch ______."
- Options: "werde, lesen" / "wird, lesen" / "werden, lesen"

QUALITY RULES:
✓ Every question MUST follow the CBSE fill-in-the-blank substitution format shown above
✓ Use realistic German sentences appropriate for Class 12 level
✓ Distractors must represent REAL student errors (wrong case, wrong conjugation)
✓ TRIPLE-CHECK: The correct_answer MUST be grammatically verified
✓ ALL EXPLANATIONS MUST BE IN ENGLISH with the grammar rule clearly stated
✓ Questions should feel like they come directly from a CBSE board paper`;

    const germanUserPrompt = `Generate exactly ${count} CBSE-BOARD-STYLE MCQs for Class 12 German, topic: "${chapterName}".

FORMAT REQUIREMENT (CRITICAL):
Every question MUST follow the exact CBSE German board exam pattern:
- A German sentence/dialogue with blank(s) to fill: ______
- Short options (1-3 words each) representing grammatical choices
- This is the ONLY acceptable format. Do NOT create definition or translation questions.

EXAMPLE of the EXACT style required:
{
  "text": "Gibst du Stefanie meine Adresse? – Ja, ich gebe ______ ______.",
  "option_a": "sie, sie",
  "option_b": "sie, ihr",
  "option_c": "ihn, ihr",
  "option_d": "es, ihr",
  "correct_answer": 2,
  "difficulty": "medium",
  "explanation": "The direct object 'Adresse' (feminine) is replaced by 'sie' (Akkusativ). The indirect object 'Stefanie' (person, feminine) is replaced by 'ihr' (Dativ). So: 'ich gebe sie ihr'."
}

Another example (Pronouns):
{
  "text": "Erzählt der Lehrer den Kindern ein Märchen? – Ja, er erzählt ______ ______.",
  "option_a": "es, ihn",
  "option_b": "ihn, ihnen",
  "option_c": "es, ihnen",
  "option_d": "sie, ihnen",
  "correct_answer": 3,
  "difficulty": "medium",
  "explanation": "'Ein Märchen' (neuter, Akkusativ) is replaced by 'es'. 'Den Kindern' (Dativ plural) is replaced by 'ihnen'. So: 'er erzählt es ihnen'."
}

Adjektive/Partizip als Nomen example:
{
  "text": "Die ______ (fremd) suchten lange ein Hotel in der Stadt.",
  "option_a": "Fremden",
  "option_b": "Fremde",
  "option_c": "Fremder",
  "option_d": "Fremd",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "'Die' is a definite article (plural, Nominativ). When an adjective is used as a noun after a definite article in plural Nominativ, it takes the '-en' ending. So: 'Die Fremden'."
}

Another Adjektiv example:
{
  "text": "Ein ______ (jugendlich) bekommt den ersten Preis.",
  "option_a": "Jugendlicher",
  "option_b": "Jugendliche",
  "option_c": "Jugendlichen",
  "option_d": "Jugendlichem",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "'Ein' is an indefinite article (masculine, Nominativ). After 'ein' in masculine Nominativ, the nominalized adjective takes the '-er' ending. So: 'Ein Jugendlicher'."
}


Passiv (Passive Voice) example:
{
  "text": "Meine Mutter machte mein Zimmer nicht sauber. → Mein Zimmer ______ von meiner Mutter nicht sauber ______.",
  "option_a": "wurde, gemacht",
  "option_b": "wird, gemacht",
  "option_c": "wurden, gemacht",
  "option_d": "wurde, machen",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "The active sentence is in Präteritum ('machte'). In Passiv Präteritum, the auxiliary is 'wurde' (singular, matching 'Mein Zimmer') + Partizip II 'gemacht'. So: 'Mein Zimmer wurde von meiner Mutter nicht sauber gemacht.'"
}

Nebensätze (Konjunktionen) example:
{
  "text": "Ich gehe jetzt schlafen, ______ ich sehr müde bin.",
  "option_a": "da",
  "option_b": "falls",
  "option_c": "sodass",
  "option_d": "als ob",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "'Da' means 'because/since' and introduces a reason. The speaker is going to sleep BECAUSE they are very tired. 'Falls' (if/in case), 'sodass' (so that), and 'als ob' (as if) don't fit the causal meaning."
}

Another Nebensätze example:
{
  "text": "Mein Bruder sieht die ganze Nacht fern, ______ schlafen.",
  "option_a": "statt zu",
  "option_b": "statt dass",
  "option_c": "da",
  "option_d": "als ob",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "'Statt zu + Infinitiv' is used when the subject of both clauses is the same. The brother watches TV INSTEAD OF sleeping."
}

IMPORTANT: Match question style to the chapter topic.
- For Adjektive als Nomen: ALWAYS include the base word in lowercase parentheses after the blank.
- For Passiv: ALWAYS show the active sentence first with arrow (→), then the passive transformation with blanks for auxiliary + Partizip II.
- For Nebensätze: Test conjunctions like da, falls, sodass, als ob, statt dass, statt...zu.

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} questions: "easy" - Common patterns, clear context clues
- ${Math.ceil(count * 0.4)} questions: "medium" - Less obvious contexts, subtle distinctions
- ${Math.floor(count * 0.3)} questions: "hard" - Complex sentences, mixed tenses, tricky constructions

Return ONLY valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

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

    // === ENGLISH-SPECIFIC PROMPTS ===
    const englishSystemPrompt = `You are India's TOP CBSE Class 12 English examiner with 25+ years experience setting board exam papers for the Flamingo and Vistas textbooks.

YOUR MISSION: Create MCQs that EXACTLY replicate the style of CBSE Class 12 English board exam questions.

CBSE ENGLISH EXAM QUESTION TYPES (use a MIX of these):

1. EXTRACT-BASED QUESTIONS (Most Important - 40% of questions):
   - Present a SHORT extract (2-4 lines, quoted verbatim or closely paraphrased) from the chapter
   - Ask inference, comprehension, or analysis questions about the extract
   - Format: "Read the extract and answer: '[extract text]' — What does the author mean by...?"
   - Test: inference, tone, word meaning in context, literary devices used

2. LITERARY DEVICE IDENTIFICATION (15% of questions):
   - Quote a specific line from the chapter that uses a literary device
   - Ask students to identify the device (metaphor, simile, irony, personification, symbolism, alliteration, etc.)
   - Format: "Identify the literary device in: '[line from text]'"

3. CHARACTER & THEME ANALYSIS (25% of questions):
   - Test understanding of character motivations, traits, and development
   - Ask about central themes and their significance
   - Format: "Why did [character] do [action]?" or "What theme is explored through [event]?"

4. FACTUAL COMPREHENSION (20% of questions):
   - Direct recall of key plot points, settings, events, character details
   - Format: "What happened when...?" or "Where did [character]...?"

QUALITY RULES:
✓ Questions MUST be specific to the chapter "${chapterName}" from the NCERT textbook
✓ Extracts must be accurate representations of the actual text
✓ All explanations MUST reference the specific chapter content
✓ Distractors must be plausible misinterpretations a student might make
✓ TRIPLE-CHECK factual accuracy against the NCERT text
✓ Use proper English literary terminology in explanations`;

    const englishUserPrompt = `Generate exactly ${count} CBSE-BOARD-STYLE MCQs for Class 12 English, chapter: "${chapterName}".

FORMAT REQUIREMENTS:
Mix the following question types as specified:
- ~40% Extract-based (quote a passage, ask about meaning/inference/device)
- ~25% Character/Theme analysis
- ~20% Factual comprehension
- ~15% Literary device identification

EXAMPLE - Extract-based:
{
  "text": "Read the extract: 'The last lesson! My books that a little while ago I found so tiresome, so heavy to carry — my grammar, my sacred history — seemed like old friends now.' What does Franz mean by calling his books 'old friends'?",
  "option_a": "He realized their value only when he was about to lose them",
  "option_b": "He had always loved studying from them",
  "option_c": "His friends had gifted him those books",
  "option_d": "The books were very old and worn out",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "Franz calls his books 'old friends' because he now realizes their importance. The impending loss of French language instruction makes him value what he previously took for granted. This reflects the theme that we appreciate things only when we are about to lose them."
}

EXAMPLE - Literary Device:
{
  "text": "Identify the literary device in: 'The iron gate of the school was shut.'",
  "option_a": "Symbolism — the gate represents the end of French education",
  "option_b": "Metaphor — comparing the gate to prison bars",
  "option_c": "Personification — the gate is given human qualities",
  "option_d": "Alliteration — repetition of the 'g' sound",
  "correct_answer": 1,
  "difficulty": "hard",
  "explanation": "The 'iron gate' symbolizes the finality and closure of French-medium education under Prussian rule. It represents the rigid enforcement of the new order. This is symbolism, not metaphor, as the gate literally exists but carries deeper meaning."
}

EXAMPLE - Character Analysis:
{
  "text": "Why did M. Hamel wear his beautiful green coat and frilled shirt on the day of the last lesson?",
  "option_a": "To pay respect to the French language and the occasion",
  "option_b": "To impress the village elders who attended the class",
  "option_c": "Because it was a festive holiday in the village",
  "option_d": "To celebrate his retirement from teaching",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "M. Hamel wore his finest clothes as a mark of respect for the French language and to honour the significance of the last French lesson. It was his way of paying tribute to something he held dear, similar to how people dress up for important, solemn occasions."
}

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} questions: "easy" - Direct recall, obvious inferences
- ${Math.ceil(count * 0.4)} questions: "medium" - Requires understanding of context, moderate inference
- ${Math.floor(count * 0.3)} questions: "hard" - Deep analysis, subtle literary devices, complex themes

CRITICAL: Every question must be specific to "${chapterName}". Do NOT create generic English questions.

Return ONLY valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === ECONOMICS-SPECIFIC PROMPTS ===
    const economicsSystemPrompt = `You are India's TOP CBSE Class 12 Economics examiner with 25+ years of experience setting board exam papers for both "Introductory Macroeconomics" and "Indian Economic Development" textbooks.

YOUR MISSION: Create MCQs that EXACTLY replicate the style and rigour of CBSE Class 12 Economics board exam questions.

CBSE ECONOMICS EXAM QUESTION TYPES (use a MIX of these):

1. CONCEPTUAL/DEFINITIONAL (20% of questions):
   - Test precise understanding of economic terms and concepts
   - Format: "What is meant by...?" or "Which of the following correctly defines...?"
   - Examples: fiscal deficit vs revenue deficit, money multiplier, MPC vs MPS, HDI components

2. NUMERICAL/CALCULATION-BASED (25% of questions):
   - Include step-by-step solvable problems with realistic data
   - MACROECONOMICS numericals:
     • National Income: GDP at MP, NNP at FC, private/personal/national disposable income
     • Money & Banking: Money multiplier = 1/LRR, credit creation = Initial deposit × (1/LRR)
     • Income Determination: Equilibrium Y = C + I + G; Multiplier k = 1/(1-MPC) = 1/MPS
     • Government Budget: Fiscal Deficit = Total Expenditure − Total Receipts (excluding borrowings); Primary Deficit = Fiscal Deficit − Interest Payments
     • BOP: Current Account Balance, Capital Account items
   - Use LaTeX for all formulas: $k = \\frac{1}{1-MPC}$, $\\Delta Y = k \\times \\Delta I$
   - Distractors must reflect common calculation errors (wrong formula, forgetting depreciation, sign errors)

3. DIAGRAM/GRAPH-BASED CONCEPTUAL (15% of questions):
   - Describe a diagram scenario and ask about shifts, movements, or equilibrium
   - AD-AS model: shifts due to policy changes, excess/deficient demand
   - Income determination: 45-degree line, C+I intersection
   - Supply-demand in foreign exchange market
   - Format: "In the AD-AS diagram, if government increases spending, what happens to...?"

4. ASSERTION-REASON / CAUSE-EFFECT (15% of questions):
   - Test understanding of economic relationships and causation
   - Format: "Statement: [economic phenomenon]. Which of the following explains this?"
   - Examples: Why does RBI increase CRR during inflation? Why is HDI a better measure than per capita income?

5. POLICY & APPLICATION (15% of questions):
   - Test understanding of fiscal policy, monetary policy, trade policy, reform measures
   - Current economic scenarios applied to NCERT theory
   - Format: "Which monetary policy tool would RBI use to control inflation?"
   - Indian Economic Development: LPG reforms, green revolution impact, rural development programmes

6. DATA INTERPRETATION & COMPARISON (10% of questions):
   - Present economic data/statistics and ask for interpretation
   - Compare pre-reform vs post-reform India, compare development indicators
   - Format: "Given the following data, calculate..." or "What can be inferred from..."

CHAPTER-SPECIFIC FOCUS:
MACROECONOMICS (Chapters 1-6):
- Ch 1 (Introduction to Macro): Macro vs Micro, circular flow, stock vs flow
- Ch 2 (National Income): GDP, GNP, NNP, NDP at MP/FC, Personal/Disposable Income, deflator
- Ch 3 (Money & Banking): Functions of money, credit creation, RBI functions, monetary policy tools (CRR, SLR, Repo, Reverse Repo, Open Market Operations)
- Ch 4 (Income Determination): Consumption function C = c̄ + bY, APC/APS/MPC/MPS, equilibrium by AD-AS and S-I approach, multiplier mechanism, excess/deficient demand
- Ch 5 (Government Budget): Revenue/Capital receipts & expenditure, types of deficits, fiscal policy measures
- Ch 6 (Open Economy): BOP current & capital account, fixed vs flexible exchange rate, managed floating, foreign exchange market demand-supply

INDIAN ECONOMIC DEVELOPMENT (Chapters 7-15):
- Ch 7 (Eve of Independence): Colonial exploitation, demographic profile, occupational structure, infrastructure at independence
- Ch 8 (1950-1990): Planning, mixed economy, land reforms, green revolution, industrial policy 1956, trade policy (import substitution)
- Ch 9 (LPG): Liberalisation, privatisation, globalisation, WTO, demonetisation, GST
- Ch 10 (Poverty): Poverty line, causes, programmes (MGNREGA, PMJDY), rural-urban disparity
- Ch 11 (Human Capital): Education, health, human capital vs human development, HDI, brain drain
- Ch 12 (Rural Development): Agricultural marketing, diversification, organic farming, credit & microfinance, SHGs
- Ch 13 (Employment): Types of unemployment, informalisation, government employment programmes
- Ch 14 (Infrastructure): Energy, health, education infrastructure, public-private roles
- Ch 15 (Environment): Environmental degradation, sustainable development, global warming, resource depletion

QUALITY RULES:
✓ 100% alignment with NCERT Class 12 Economics textbooks
✓ Numerical problems must be SOLVABLE with clear data — show all needed values
✓ All formulas in LaTeX: $Y = C + I + G + (X-M)$, $k = \\frac{1}{1-b}$
✓ Distractors must represent REAL student errors (wrong formula, conceptual confusion)
✓ Explanations must teach the concept with step-by-step solutions for numericals
✓ TRIPLE-CHECK: correct_answer MUST match the verified solution`;

    const economicsUserPrompt = `Generate exactly ${count} CBSE-BOARD-STYLE MCQs for Class 12 Economics, chapter: "${chapterName}".

FORMAT REQUIREMENTS:
Mix the following question types as specified:
- ~25% Numerical/Calculation-based (with LaTeX formulas, step-by-step)
- ~20% Conceptual/Definitional
- ~15% Diagram/Graph-based conceptual
- ~15% Assertion-Reason / Cause-Effect
- ~15% Policy & Application
- ~10% Data Interpretation & Comparison

EXAMPLE - Numerical (National Income):
{
  "text": "Calculate Net National Product at Factor Cost from the following data:\\n(i) Net Domestic Product at Factor Cost = ₹8,000 crores\\n(ii) Factor income from abroad = ₹200 crores\\n(iii) Factor income to abroad = ₹350 crores",
  "option_a": "₹7,850 crores",
  "option_b": "₹8,550 crores",
  "option_c": "₹8,150 crores",
  "option_d": "₹7,650 crores",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "$NNP_{FC} = NDP_{FC} + \\text{Net Factor Income from Abroad}$\\n$= NDP_{FC} + (\\text{Factor Income from Abroad} - \\text{Factor Income to Abroad})$\\n$= 8000 + (200 - 350)$\\n$= 8000 + (-150)$\\n$= ₹7,850$ crores.\\nOption B incorrectly adds both factor incomes. Option C adds NFIA instead of subtracting."
}

EXAMPLE - Conceptual (Money & Banking):
{
  "text": "If the Legal Reserve Ratio (LRR) is 20%, what is the value of the money multiplier?",
  "option_a": "5",
  "option_b": "4",
  "option_c": "20",
  "option_d": "0.2",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "Money Multiplier $= \\frac{1}{LRR} = \\frac{1}{0.20} = 5$. This means every ₹1 of initial deposit can create ₹5 of total deposits in the banking system. Option B is a common error (using 25% instead of 20%). Option C confuses the percentage with the multiplier. Option D gives LRR itself."
}

EXAMPLE - Policy/Application (Government Budget):
{
  "text": "Which of the following is a capital receipt in the government budget?",
  "option_a": "Recovery of loans given by the government",
  "option_b": "Income tax collected from individuals",
  "option_c": "Profits of public sector undertakings",
  "option_d": "Fees and fines collected by government",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "Recovery of loans is a capital receipt because it reduces the assets of the government (creates a liability reduction). Options B, C, and D are all revenue receipts as they neither create a liability nor reduce assets of the government."
}

EXAMPLE - Cause-Effect (Indian Economic Development):
{
  "text": "Why was the policy of import substitution adopted in India during the planning period (1950-1990)?",
  "option_a": "To protect domestic industries from foreign competition and promote self-reliance",
  "option_b": "To increase foreign exchange reserves through more imports",
  "option_c": "To encourage multinational companies to set up factories in India",
  "option_d": "To reduce the fiscal deficit of the government",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "Import substitution was a trade strategy to replace imports with domestically produced goods, thereby protecting infant Indian industries from foreign competition and promoting self-reliance. This was implemented through heavy tariffs and quotas on imports. It was NOT about increasing imports (B) or inviting MNCs (C)."
}

EXAMPLE - Diagram-based (Income Determination):
{
  "text": "In the Keynesian income determination model, if Aggregate Demand (AD) is greater than Aggregate Supply (AS) at a given level of income, what will happen?",
  "option_a": "Producers will increase output, leading to rise in income towards equilibrium",
  "option_b": "Producers will decrease output, leading to fall in income",
  "option_c": "The economy is already at equilibrium",
  "option_d": "Planned saving will increase immediately",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "When AD > AS, there is excess demand. Producers find their inventory depleting faster than expected, so they increase production. This raises income and employment until AD = AS equilibrium is reached. This is the adjustment mechanism in the Keynesian model."
}

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} questions: "easy" - Direct recall, simple formula application, one-step
- ${Math.ceil(count * 0.4)} questions: "medium" - Multi-step numericals, conceptual analysis, policy reasoning
- ${Math.floor(count * 0.3)} questions: "hard" - Complex calculations, multi-concept integration, data interpretation

CRITICAL: Every question must be specific to "${chapterName}". Match the chapter focus areas listed above.

Return ONLY valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET ENGLISH-SPECIFIC PROMPTS ===
    const cuetEnglishSystemPrompt = `You are India's TOP NTA CUET-UG English Language question paper setter with 20+ years experience creating competitive entrance exam questions.

YOUR MISSION: Create MCQs that EXACTLY replicate the style, difficulty, and format of NTA CUET-UG English Language section questions.

CUET ENGLISH IS NOT CBSE LITERATURE. It tests LANGUAGE PROFICIENCY, not knowledge of novels/poems/textbooks.

CHAPTER-SPECIFIC QUESTION PATTERNS:

**Reading Comprehension:**
- Present a passage (150-250 words) on a factual/argumentative/literary topic
- Ask 4-5 questions per passage testing: main idea, inference, vocabulary in context, tone, author's purpose
- Passages should be from: editorials, science articles, social issues, historical events, philosophical musings
- Format: "Read the passage and answer: [passage]\\nQ: What is the central argument of the passage?"

**Vocabulary & Word Usage:**
- Synonyms: "Choose the word closest in meaning to '[word]' as used in the sentence: '[sentence]'"
- Antonyms: "Choose the word opposite in meaning to '[word]'"
- One-word substitutions: "What single word means '[definition]'?"
- Spelling corrections: "Identify the correctly spelled word"
- Foreign words/phrases commonly used in English

**English Grammar & Usage:**
- Tenses (simple, continuous, perfect, perfect continuous — all 12 forms)
- Subject-verb agreement with complex subjects
- Articles (a/an/the/zero article) in context
- Modals (can/could/may/might/shall/should/will/would/must)
- Voice (active to passive transformation)
- Narration (direct to indirect speech transformation)
- Prepositions in idiomatic usage

**Sentence Correction & Rearrangement:**
- Spot the error: "Identify the part of the sentence that has an error"
- Sentence improvement: "Choose the best replacement for the underlined part"
- Sentence rearrangement: "Arrange sentences P, Q, R, S to form a coherent paragraph"
- Para jumbles with logical connectors

**Idioms, Phrases & Synonyms-Antonyms:**
- "What does the idiom '[idiom]' mean?"
- Phrasal verbs: "The word 'put up with' means..."
- Proverbs and their meanings
- Contextual usage of idioms in sentences

**Cloze Test & Fill in the Blanks:**
- Present a passage with numbered blanks
- Each blank tests: vocabulary, grammar, collocations, prepositions, or conjunctions
- Options should be close in meaning but only one fits the context perfectly

QUALITY RULES:
✓ Questions must test LANGUAGE SKILLS, not literature knowledge
✓ NO questions about novels, poems, stories, or NCERT textbooks
✓ Difficulty should match NTA CUET-UG competitive exam level
✓ Distractors must be plausible — commonly confused words, near-synonyms
✓ Grammar questions must test rules, not rote memorization
✓ Passages for reading comprehension should be original, not from known sources
✓ Every explanation must cite the grammar rule or reasoning clearly`;

    const cuetEnglishUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET English, topic: "${chapterName}".

MATCH THE TOPIC EXACTLY:
- "Reading Comprehension" → passage-based questions with inference, tone, vocabulary
- "Vocabulary & Word Usage" → synonyms, antonyms, one-word substitutions, contextual meaning
- "English Grammar & Usage" → tenses, articles, subject-verb agreement, modals, voice, narration
- "Sentence Correction & Rearrangement" → error spotting, sentence improvement, para jumbles
- "Idioms, Phrases & Synonyms-Antonyms" → idiom meanings, phrasal verbs, proverbs
- "Cloze Test & Fill in the Blanks" → contextual fill-ups testing vocabulary and grammar

EXAMPLE - Reading Comprehension:
{
  "text": "Read the passage and answer:\\n\\n'The rise of artificial intelligence has sparked debates about the future of employment. While automation threatens routine jobs, it also creates new roles in data science, AI ethics, and human-machine collaboration. Economists argue that historical technological revolutions have always created more jobs than they destroyed, though the transition period can be painful for displaced workers.'\\n\\nWhat is the author's overall stance on AI and employment?",
  "option_a": "Cautiously optimistic — AI will create new jobs despite short-term disruption",
  "option_b": "Completely pessimistic — AI will destroy all jobs",
  "option_c": "Neutral — the author presents no opinion",
  "option_d": "Dismissive — the author considers the debate irrelevant",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "The author acknowledges the threat ('threatens routine jobs') but balances it with positives ('creates new roles') and historical evidence ('always created more jobs'). The phrase 'transition period can be painful' shows awareness of downsides, making the tone cautiously optimistic, not purely positive or negative."
}

EXAMPLE - Grammar:
{
  "text": "Choose the correct option to fill the blank:\\n\\n'Neither the manager nor the employees ______ satisfied with the new policy.'",
  "option_a": "were",
  "option_b": "was",
  "option_c": "is",
  "option_d": "has been",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "With 'neither...nor', the verb agrees with the subject closest to it. Here, 'employees' (plural) is closest, so the plural verb 'were' is correct. This is the rule of proximity in subject-verb agreement."
}

EXAMPLE - Vocabulary:
{
  "text": "Choose the word closest in meaning to 'EPHEMERAL':",
  "option_a": "Transient",
  "option_b": "Eternal",
  "option_c": "Magnificent",
  "option_d": "Mysterious",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "'Ephemeral' means lasting for a very short time, which is synonymous with 'transient'. 'Eternal' is the antonym. 'Magnificent' and 'mysterious' are unrelated."
}

EXAMPLE - Idioms:
{
  "text": "What does the idiom 'to burn the midnight oil' mean?",
  "option_a": "To work or study late into the night",
  "option_b": "To waste resources carelessly",
  "option_c": "To start a fire accidentally",
  "option_d": "To wake up very early in the morning",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "'Burning the midnight oil' refers to working or studying late at night, originating from the era when oil lamps were used for lighting. It implies hard work and dedication."
}

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} questions: "easy" - Common vocabulary, basic grammar rules, well-known idioms
- ${Math.ceil(count * 0.4)} questions: "medium" - Advanced vocabulary, complex grammar, inference-based
- ${Math.floor(count * 0.3)} questions: "hard" - Nuanced comprehension, tricky grammar exceptions, rare idioms

CRITICAL: Questions must match the "${chapterName}" topic EXACTLY. Do NOT mix topics.
CRITICAL: This is CUET (competitive exam), NOT CBSE literature. NO questions about poems, stories, or textbook chapters.

Return ONLY valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    const systemPrompt = isGerman ? germanSystemPrompt : isCuetEnglish ? cuetEnglishSystemPrompt : isEnglish ? englishSystemPrompt : isEconomics ? economicsSystemPrompt : defaultSystemPrompt;
    const userPrompt = isGerman ? germanUserPrompt : isCuetEnglish ? cuetEnglishUserPrompt : isEnglish ? englishUserPrompt : isEconomics ? economicsUserPrompt : defaultUserPrompt;

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
      const validation = validateQuestionQuality(q, subjectName);
      
      if (validation.valid) {
        if (validation.warnings.length > 0) {
          console.warn(`Question ${i + 1} warnings:`, validation.warnings);
        }

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
