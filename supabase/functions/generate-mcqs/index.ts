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

  if (subject.includes('cuet') && subject.includes('physics')) {
    return `
CUET PHYSICS-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG pattern — NOT CBSE board style
- Focus on numerical problems with multiple concepts tested together
- Include assertion-reason type questions
- Test application of formulas in unfamiliar contexts
- Distractors should reflect sign errors, unit confusion, and formula mix-ups
- Include conceptual MCQs that test deep understanding over rote recall`;
  }

  if (subject.includes('cuet') && subject.includes('chemistry')) {
    return `
CUET CHEMISTRY-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG pattern — NOT CBSE board style
- Include reaction-based questions testing products, reagents, and conditions
- IUPAC naming must follow latest conventions
- Numerical problems: molarity, pH, electrochemistry, thermodynamics
- Include assertion-reason and matching-type conceptual questions
- Organic chemistry: test named reactions, mechanisms, and conversions`;
  }

  if (subject.includes('cuet') && (subject.includes('math') || subject.includes('mathematics'))) {
    return `
CUET MATHEMATICS-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG pattern — NOT CBSE board style
- Multi-step problems requiring 3-5 steps to solve
- Test conceptual depth: why a formula works, not just applying it
- Include problems combining multiple topics (e.g., calculus + algebra)
- Distractors must reflect real student errors: sign mistakes, domain errors, incomplete simplification
- Use LaTeX for all mathematical notation`;
  }

  if (subject.includes('cuet') && subject.includes('biology')) {
    return `
CUET BIOLOGY-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG pattern — NOT CBSE board style
- Include assertion-reason type questions
- Test process sequences (cell cycle, Krebs cycle, DNA replication steps)
- Include diagram-based conceptual questions (heart, nephron, flower structure)
- Genetics: Mendelian ratios, pedigree analysis, molecular biology
- Ecology: population interactions, ecosystems, biodiversity
- Distractors should reflect common confusions between similar biological terms`;
  }

  if (subject.includes('cuet') && subject.includes('economics')) {
    return `
CUET ECONOMICS-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG pattern — NOT CBSE board style
- Include numerical problems: national income, money multiplier, multiplier effect
- Test graph/diagram-based reasoning: AD-AS model, demand-supply curves
- Assertion-reason questions on economic relationships
- Policy application: fiscal vs monetary policy, LPG reforms impact
- Data interpretation from economic indicators
- Use LaTeX for all formulas: $k = \\frac{1}{1-MPC}$`;
  }

  if (subject.includes('cuet') && subject.includes('history')) {
    return `
CUET HISTORY-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG pattern — NOT CBSE board style
- Source-based questions: interpret archaeological evidence, inscriptions, texts
- Map-based conceptual questions: locate kingdoms, trade routes, important sites
- Assertion-reason format for cause-effect in historical events
- Chronological ordering and timeline-based questions
- Compare and contrast different historical perspectives
- Focus on themes: Bricks Beads & Bones, Kings Farmers & Towns, Bhakti-Sufi, Mughal Courts, Colonial Cities`;
  }

  if (subject.includes('cuet') && (subject.includes('political') || subject.includes('polity'))) {
    return `
CUET POLITICAL SCIENCE-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG pattern — NOT CBSE board style
- Test constitutional provisions with specific article numbers
- Assertion-reason on political concepts and their implications
- Case-based questions on landmark judgments and political events
- Compare political ideologies and institutional mechanisms
- Contemporary politics: coalition politics, social movements, globalization
- International relations: Cold War, NAM, UN, emerging power dynamics`;
  }

  if (subject.includes('cuet') && subject.includes('general')) {
    return `
CUET GENERAL TEST-SPECIFIC RULES (NTA COMPETITIVE EXAM):
- Questions must match NTA CUET-UG General Test pattern
- General Knowledge: current affairs, static GK, awards, sports, geography
- Mental Ability: logical reasoning, series, coding-decoding, blood relations, direction sense
- Numerical Ability: simplification, percentages, ratio-proportion, time-speed-distance, averages
- General English within General Test: basic grammar, vocabulary, comprehension
- Quantitative Reasoning: data interpretation, number series, basic algebra`;
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
    const isCuetBiology = isCuet && subjectLower.includes('biology');
    const isCuetEconomics = isCuet && subjectLower.includes('economics');
    const isCuetHistory = isCuet && subjectLower.includes('history');
    const isCuetPolSci = isCuet && (subjectLower.includes('political') || subjectLower.includes('polity'));
    const isCuetGeneralTest = isCuet && (subjectLower.includes('general test') || subjectLower.includes('general'));
    const isCuetSubject = isCuetEnglish || isCuetPhysics || isCuetChemistry || isCuetMath || isCuetBiology || isCuetEconomics || isCuetHistory || isCuetPolSci || isCuetGeneralTest;
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

    // === CUET PHYSICS-SPECIFIC PROMPTS ===
    const cuetPhysicsSystemPrompt = `You are India's TOP NTA CUET-UG Physics question paper setter with 20+ years experience creating competitive entrance exam questions.

YOUR MISSION: Create MCQs that EXACTLY replicate the style, difficulty, and format of NTA CUET-UG Physics section questions.

CUET PHYSICS IS NOT A CBSE BOARD EXAM. It tests deeper conceptual understanding and problem-solving at a competitive exam level.

KEY DIFFERENCES FROM CBSE BOARD:
- More numerical problems requiring multi-step reasoning
- Assertion-Reason format questions are common
- Higher cognitive level — Analyze & Evaluate, not just Remember & Apply
- Problems often combine concepts from multiple chapters
- Tricky distractors based on sign errors, dimensional mistakes, and formula confusion

NTA CUET-UG PHYSICS QUESTION TYPES:

1. NUMERICAL PROBLEMS (40%):
   - Multi-step calculations with proper SI units
   - Problems requiring 3-5 steps to solve
   - Use LaTeX for all formulas and equations
   - Distractors: common calculation errors (sign, power of 10, wrong formula)

2. CONCEPTUAL MCQs (30%):
   - Test deep understanding of physical principles
   - "Which of the following statements is/are correct?" format
   - Application of concepts to new/unfamiliar situations

3. ASSERTION-REASON (15%):
   - Assertion (A): [statement]
   - Reason (R): [explanation]
   - Options: Both correct & R explains A / Both correct but R doesn't explain A / A correct R wrong / A wrong R correct

4. DIAGRAM/GRAPH-BASED (15%):
   - Describe circuit diagrams, ray diagrams, or graphs textually
   - Ask about behavior, readings, or changes

TOPIC AREAS (NTA CUET-UG Syllabus):
- Electrostatics & Current Electricity
- Magnetic Effects & Electromagnetic Induction
- AC & Electromagnetic Waves
- Optics (Ray & Wave)
- Dual Nature of Matter & Radiation
- Atoms & Nuclei
- Semiconductor Electronics
- Communication Systems

${subjectGuidelines}

QUALITY RULES:
✓ All numerical values must be physically realistic
✓ Units must be consistent (SI preferred)
✓ LaTeX for all math: $F = qvB\\sin\\theta$, $E = \\frac{kq}{r^2}$
✓ Explanations must show complete solution steps
✓ TRIPLE-CHECK: correct_answer MUST match verified solution`;

    const cuetPhysicsUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET Physics, chapter: "${chapterName}".

MATCH NTA CUET-UG PATTERN:
- 40% Numerical problems (multi-step, with LaTeX)
- 30% Conceptual MCQs (deep understanding, not recall)
- 15% Assertion-Reason format
- 15% Diagram/Graph-based conceptual

EXAMPLE - Numerical:
{
  "text": "A parallel plate capacitor with plate area $A = 100\\\\,\\\\text{cm}^2$ and separation $d = 2\\\\,\\\\text{mm}$ is connected to a $200\\\\,\\\\text{V}$ battery. The energy stored in the capacitor is: (Take $\\\\varepsilon_0 = 8.85 \\\\times 10^{-12}\\\\,\\\\text{F/m}$)",
  "option_a": "$8.85 \\\\times 10^{-7}\\\\,\\\\text{J}$",
  "option_b": "$8.85 \\\\times 10^{-5}\\\\,\\\\text{J}$",
  "option_c": "$4.43 \\\\times 10^{-7}\\\\,\\\\text{J}$",
  "option_d": "$1.77 \\\\times 10^{-6}\\\\,\\\\text{J}$",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "$C = \\\\frac{\\\\varepsilon_0 A}{d} = \\\\frac{8.85 \\\\times 10^{-12} \\\\times 100 \\\\times 10^{-4}}{2 \\\\times 10^{-3}} = 4.425 \\\\times 10^{-11}\\\\,\\\\text{F}$. Energy $U = \\\\frac{1}{2}CV^2 = \\\\frac{1}{2} \\\\times 4.425 \\\\times 10^{-11} \\\\times (200)^2 = 8.85 \\\\times 10^{-7}\\\\,\\\\text{J}$. Option B has a power-of-10 error. Option C forgets the $\\\\frac{1}{2}$ factor."
}

EXAMPLE - Assertion-Reason:
{
  "text": "Assertion (A): The resistance of a semiconductor decreases with increase in temperature.\\nReason (R): The number of charge carriers in a semiconductor increases with temperature.",
  "option_a": "Both A and R are correct, and R is the correct explanation of A",
  "option_b": "Both A and R are correct, but R is NOT the correct explanation of A",
  "option_c": "A is correct but R is incorrect",
  "option_d": "A is incorrect but R is correct",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "In semiconductors, increasing temperature provides energy for more electrons to jump the band gap, increasing charge carrier concentration. Since resistance $R = \\\\frac{1}{ne\\\\mu}$, more carriers (n) means lower resistance. Both statements are correct and R correctly explains A."
}

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} questions: "easy" - Single concept, direct formula application
- ${Math.ceil(count * 0.4)} questions: "medium" - Multi-step, concept combination
- ${Math.floor(count * 0.3)} questions: "hard" - Complex analysis, tricky setups, multi-concept

CRITICAL: Questions must be specific to "${chapterName}". Match NTA CUET-UG level, NOT CBSE board level.

Return ONLY valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET CHEMISTRY-SPECIFIC PROMPTS ===
    const cuetChemistrySystemPrompt = `You are India's TOP NTA CUET-UG Chemistry question paper setter with 20+ years experience creating competitive entrance exam questions.

YOUR MISSION: Create MCQs that EXACTLY replicate the style, difficulty, and format of NTA CUET-UG Chemistry section questions.

CUET CHEMISTRY IS NOT A CBSE BOARD EXAM. It tests deeper conceptual understanding and problem-solving at a competitive exam level.

NTA CUET-UG CHEMISTRY QUESTION TYPES:

1. REACTION-BASED (30%):
   - Products of reactions, reagents needed, reaction conditions
   - Named reactions with mechanisms (for organic)
   - Balancing equations and stoichiometry
   - Conversion problems: A → B → C (identify intermediates/reagents)

2. NUMERICAL PROBLEMS (25%):
   - Molarity, molality, mole fraction calculations
   - pH, buffer solutions, solubility product
   - Electrochemistry: EMF, Nernst equation, Faraday's laws
   - Thermodynamics: enthalpy, entropy, Gibbs free energy
   - Use LaTeX for all formulas

3. CONCEPTUAL MCQs (25%):
   - Periodic trends with specific examples
   - IUPAC nomenclature (latest conventions)
   - Isomerism types with structural analysis
   - Compare properties of similar compounds
   - "Which of the following is correct?" format

4. ASSERTION-REASON (10%):
   - Standard NTA format with 4 options

5. MATCHING/SEQUENCE (10%):
   - Match reagents to products
   - Arrange in order of property (acidity, boiling point, etc.)

TOPIC AREAS (NTA CUET-UG Syllabus):
- Solid State, Solutions, Electrochemistry, Chemical Kinetics
- Surface Chemistry, Isolation of Elements
- p-Block, d-Block & f-Block Elements, Coordination Compounds
- Haloalkanes, Alcohols, Aldehydes, Carboxylic Acids, Amines
- Biomolecules, Polymers, Chemistry in Everyday Life

${subjectGuidelines}

QUALITY RULES:
✓ All reactions must be chemically accurate and balanced
✓ IUPAC names must follow 2013+ recommendations
✓ LaTeX for formulas: $\\Delta G = \\Delta H - T\\Delta S$, $E_{cell} = E^\\circ - \\frac{RT}{nF}\\ln Q$
✓ Organic structures described clearly in text
✓ Explanations must justify WHY the answer is correct
✓ TRIPLE-CHECK: reaction products and numerical answers`;

    const cuetChemistryUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET Chemistry, chapter: "${chapterName}".

MATCH NTA CUET-UG PATTERN:
- 30% Reaction-based (products, reagents, named reactions)
- 25% Numerical (pH, EMF, molarity, thermodynamics)
- 25% Conceptual (trends, nomenclature, isomerism)
- 10% Assertion-Reason
- 10% Matching/Sequence

EXAMPLE - Reaction-based:
{
  "text": "What is the major product when phenol reacts with bromine water?",
  "option_a": "2,4,6-tribromophenol",
  "option_b": "2-bromophenol",
  "option_c": "4-bromophenol",
  "option_d": "2,4-dibromophenol",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "Phenol is highly activated towards electrophilic aromatic substitution due to the strong +M effect of the -OH group. With bromine water (excess Br₂), all three activated positions (ortho-2, ortho-6, para-4) are brominated, giving 2,4,6-tribromophenol as a white precipitate. Mono/di-bromination occurs only with limited Br₂ in non-polar solvents."
}

EXAMPLE - Numerical:
{
  "text": "Calculate the EMF of the cell: $\\\\text{Zn} | \\\\text{Zn}^{2+}(0.1\\\\,M) || \\\\text{Cu}^{2+}(1.0\\\\,M) | \\\\text{Cu}$\\nGiven: $E^\\\\circ_{\\\\text{Zn}^{2+}/\\\\text{Zn}} = -0.76\\\\,V$, $E^\\\\circ_{\\\\text{Cu}^{2+}/\\\\text{Cu}} = +0.34\\\\,V$",
  "option_a": "$1.13\\\\,V$",
  "option_b": "$1.10\\\\,V$",
  "option_c": "$0.42\\\\,V$",
  "option_d": "$1.07\\\\,V$",
  "correct_answer": 1,
  "difficulty": "hard",
  "explanation": "$E^\\\\circ_{cell} = E^\\\\circ_{cathode} - E^\\\\circ_{anode} = 0.34 - (-0.76) = 1.10\\\\,V$. Using Nernst equation: $E = E^\\\\circ - \\\\frac{0.059}{n}\\\\log Q = 1.10 - \\\\frac{0.059}{2}\\\\log\\\\frac{0.1}{1.0} = 1.10 - \\\\frac{0.059}{2}(-1) = 1.10 + 0.03 = 1.13\\\\,V$."
}

EXAMPLE - Assertion-Reason:
{
  "text": "Assertion (A): $\\\\text{SiO}_2$ is a covalent solid with very high melting point.\\nReason (R): $\\\\text{SiO}_2$ has a three-dimensional network structure with strong Si–O covalent bonds.",
  "option_a": "Both A and R are correct, and R is the correct explanation of A",
  "option_b": "Both A and R are correct, but R is NOT the correct explanation of A",
  "option_c": "A is correct but R is incorrect",
  "option_d": "A is incorrect but R is correct",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "SiO₂ (quartz) is indeed a covalent/network solid. Its very high melting point (~1700°C) is due to the 3D network of strong Si–O bonds that must be broken for melting. R correctly explains A."
}

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} questions: "easy" - Single concept, direct application
- ${Math.ceil(count * 0.4)} questions: "medium" - Multi-step, deeper reasoning
- ${Math.floor(count * 0.3)} questions: "hard" - Complex numericals, multi-concept

CRITICAL: Questions must be specific to "${chapterName}". Match NTA CUET-UG level, NOT CBSE board level.

Return ONLY valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET MATHEMATICS-SPECIFIC PROMPTS ===
    const cuetMathSystemPrompt = `You are India's TOP NTA CUET-UG Mathematics question paper setter with 20+ years experience creating competitive entrance exam questions.

YOUR MISSION: Create MCQs that EXACTLY replicate the style, difficulty, and format of NTA CUET-UG Mathematics section questions.

CUET MATHEMATICS IS NOT A CBSE BOARD EXAM. It tests deeper problem-solving and analytical thinking at a competitive exam level.

NTA CUET-UG MATHEMATICS QUESTION TYPES:

1. PROBLEM-SOLVING (45%):
   - Multi-step problems requiring 3-5 steps
   - Problems that combine concepts from different areas
   - Each step must be logically connected
   - Use LaTeX for ALL mathematical notation

2. CONCEPTUAL MCQs (25%):
   - Test understanding of mathematical concepts, not just computation
   - "Which of the following is true?" format
   - Properties of functions, relations, matrices, vectors
   - Domain, range, and behavior analysis

3. APPLICATION-BASED (20%):
   - Real-world problems modeled mathematically
   - Optimization using calculus (maxima/minima)
   - Probability in practical scenarios
   - Linear programming applications

4. ASSERTION-REASON (10%):
   - Standard NTA format
   - Mathematical statements and their justifications

TOPIC AREAS (NTA CUET-UG Syllabus):
- Relations & Functions, Inverse Trigonometric Functions
- Matrices & Determinants
- Continuity, Differentiability, Applications of Derivatives
- Integrals, Applications of Integrals, Differential Equations
- Vectors & 3D Geometry
- Linear Programming, Probability

MATHEMATICAL NOTATION (CRITICAL):
- Fractions: $\\frac{a}{b}$
- Integrals: $\\int_0^{\\pi} \\sin x\\,dx$
- Derivatives: $\\frac{dy}{dx}$, $f'(x)$
- Matrices: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$
- Vectors: $\\vec{a} \\cdot \\vec{b}$, $|\\vec{a} \\times \\vec{b}|$
- Limits: $\\lim_{x \\to 0}$
- Summations: $\\sum_{i=1}^{n}$

${subjectGuidelines}

QUALITY RULES:
✓ Every numerical answer must be verified by solving
✓ All steps must be mathematically rigorous
✓ Distractors must represent real errors (sign, domain, incomplete simplification)
✓ LaTeX is MANDATORY for all math expressions
✓ Explanations must show complete step-by-step solutions
✓ TRIPLE-CHECK: correct_answer MUST match the computed solution`;

    const cuetMathUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET Mathematics, chapter: "${chapterName}".

MATCH NTA CUET-UG PATTERN:
- 45% Problem-solving (multi-step, LaTeX notation)
- 25% Conceptual (properties, behavior, domain analysis)
- 20% Application-based (optimization, probability, modeling)
- 10% Assertion-Reason

EXAMPLE - Problem-solving (Calculus):
{
  "text": "Evaluate: $\\\\int_0^{\\\\pi/2} \\\\frac{\\\\sin x}{\\\\sin x + \\\\cos x}\\\\,dx$",
  "option_a": "$\\\\frac{\\\\pi}{4}$",
  "option_b": "$\\\\frac{\\\\pi}{2}$",
  "option_c": "$1$",
  "option_d": "$\\\\frac{1}{2}$",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "Let $I = \\\\int_0^{\\\\pi/2} \\\\frac{\\\\sin x}{\\\\sin x + \\\\cos x}\\\\,dx$. Using the property $\\\\int_0^a f(x)\\\\,dx = \\\\int_0^a f(a-x)\\\\,dx$, we get $I = \\\\int_0^{\\\\pi/2} \\\\frac{\\\\cos x}{\\\\cos x + \\\\sin x}\\\\,dx$. Adding both: $2I = \\\\int_0^{\\\\pi/2} 1\\\\,dx = \\\\frac{\\\\pi}{2}$. Therefore $I = \\\\frac{\\\\pi}{4}$."
}

EXAMPLE - Conceptual (Matrices):
{
  "text": "If $A$ is a square matrix of order 3 such that $|A| = 5$, then $|\\\\text{adj}(A)|$ is:",
  "option_a": "25",
  "option_b": "5",
  "option_c": "125",
  "option_d": "15",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "For a square matrix of order $n$, $|\\\\text{adj}(A)| = |A|^{n-1}$. Here $n = 3$, so $|\\\\text{adj}(A)| = 5^{3-1} = 5^2 = 25$. Option C confuses with $|A|^n$. Option B uses $|A|^1$."
}

EXAMPLE - Application (Probability):
{
  "text": "A bag contains 5 red and 3 blue balls. Two balls are drawn at random without replacement. What is the probability that both balls are red?",
  "option_a": "$\\\\frac{5}{14}$",
  "option_b": "$\\\\frac{25}{64}$",
  "option_c": "$\\\\frac{10}{28}$",
  "option_d": "$\\\\frac{5}{8}$",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "$P = \\\\frac{5}{8} \\\\times \\\\frac{4}{7} = \\\\frac{20}{56} = \\\\frac{5}{14}$. Without replacement: after drawing 1 red ball (5/8), there are 4 red left out of 7 total. Option B incorrectly uses with-replacement probability. Option C is unsimplified but equivalent — however $\\\\frac{10}{28} = \\\\frac{5}{14}$, so this would also be correct if not simplified. Option D only considers the first draw."
}

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} questions: "easy" - Single concept, direct computation
- ${Math.ceil(count * 0.4)} questions: "medium" - Multi-step, property application
- ${Math.floor(count * 0.3)} questions: "hard" - Complex integration, multi-concept proofs

CRITICAL: Questions must be specific to "${chapterName}". Match NTA CUET-UG level, NOT CBSE board level.

Return ONLY valid JSON array with objects having: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET BIOLOGY-SPECIFIC PROMPTS ===
    const cuetBiologySystemPrompt = `You are India's TOP NTA CUET-UG Biology question paper setter with 20+ years experience.

YOUR MISSION: Create MCQs matching NTA CUET-UG Biology section — NOT CBSE board style.

NTA CUET-UG BIOLOGY QUESTION TYPES:
1. CONCEPTUAL MCQs (35%): Deep understanding of biological processes, not rote recall
2. ASSERTION-REASON (20%): Standard NTA format testing cause-effect in biology
3. DIAGRAM/PROCESS-BASED (20%): Describe diagrams textually, test identification of parts/stages
4. APPLICATION-BASED (15%): Apply biological concepts to new scenarios (genetic crosses, ecological problems)
5. MATCHING/SEQUENCE (10%): Match structures to functions, arrange stages in order

TOPIC AREAS: Reproduction, Genetics & Evolution, Biology & Human Welfare, Biotechnology, Ecology

${subjectGuidelines}

QUALITY RULES:
✓ Scientific nomenclature must be accurate (genus species in italics indicated)
✓ Genetic ratios and crosses must be mathematically verified
✓ Process sequences must be in correct biological order
✓ Explanations must cite specific biological mechanisms`;

    const cuetBiologyUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET Biology, chapter: "${chapterName}".

MATCH NTA CUET-UG PATTERN:
- 35% Conceptual (deep understanding, processes)
- 20% Assertion-Reason
- 20% Diagram/Process-based
- 15% Application-based (crosses, ecological scenarios)
- 10% Matching/Sequence

EXAMPLE - Assertion-Reason:
{
  "text": "Assertion (A): Ozone layer depletion increases the risk of skin cancer.\\nReason (R): UV-B radiation causes DNA damage and mutations in skin cells.",
  "option_a": "Both A and R are correct, and R is the correct explanation of A",
  "option_b": "Both A and R are correct, but R is NOT the correct explanation of A",
  "option_c": "A is correct but R is incorrect",
  "option_d": "A is incorrect but R is correct",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "Ozone depletion allows more UV-B to reach Earth's surface. UV-B causes thymine dimers in DNA, leading to mutations that can cause skin cancer. R correctly explains the mechanism behind A."
}

EXAMPLE - Genetics Application:
{
  "text": "In a cross between two heterozygous tall plants (Tt × Tt), what fraction of the offspring will be homozygous?",
  "option_a": "$\\\\frac{1}{2}$",
  "option_b": "$\\\\frac{1}{4}$",
  "option_c": "$\\\\frac{3}{4}$",
  "option_d": "$\\\\frac{2}{3}$",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "Tt × Tt gives: TT (1/4) + Tt (2/4) + tt (1/4). Homozygous = TT + tt = 1/4 + 1/4 = 1/2. Option B gives only one homozygous class. Option C is the phenotypic ratio for tall."
}

DIFFICULTY DISTRIBUTION:
- ${Math.ceil(count * 0.3)} easy, ${Math.ceil(count * 0.4)} medium, ${Math.floor(count * 0.3)} hard

Return ONLY valid JSON array with: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET ECONOMICS-SPECIFIC PROMPTS ===
    const cuetEconomicsSystemPrompt = `You are India's TOP NTA CUET-UG Economics question paper setter with 20+ years experience.

YOUR MISSION: Create MCQs matching NTA CUET-UG Economics section — NOT CBSE board style.

NTA CUET-UG ECONOMICS QUESTION TYPES:
1. NUMERICAL/CALCULATION (30%): National income, multiplier, money creation, elasticity — use LaTeX
2. CONCEPTUAL (25%): Economic theories, definitions, relationships
3. ASSERTION-REASON (15%): Cause-effect in economic phenomena
4. POLICY & APPLICATION (15%): Fiscal/monetary policy, reform impacts, current economy
5. DATA INTERPRETATION (15%): Interpret economic data, compare indicators

TOPICS: Macro (National Income, Money & Banking, AD-AS, Government Budget, BOP) and Indian Economy (Planning, LPG, Poverty, HRD, Rural Dev, Employment, Infrastructure, Environment)

${subjectGuidelines}

QUALITY RULES:
✓ All formulas in LaTeX: $k = \\frac{1}{1-MPC}$, $Y = C + I + G + (X-M)$
✓ Numerical problems must be fully solvable with given data
✓ Distractors must reflect real student errors
✓ Explanations must show step-by-step solutions for numericals`;

    const cuetEconomicsUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET Economics, chapter: "${chapterName}".

MATCH NTA CUET-UG PATTERN:
- 30% Numerical (LaTeX, multi-step)
- 25% Conceptual
- 15% Assertion-Reason
- 15% Policy & Application
- 15% Data Interpretation

EXAMPLE - Numerical:
{
  "text": "If MPC is 0.8 and autonomous investment increases by ₹500 crores, the increase in equilibrium income will be:",
  "option_a": "₹2,500 crores",
  "option_b": "₹500 crores",
  "option_c": "₹400 crores",
  "option_d": "₹625 crores",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "Multiplier $k = \\\\frac{1}{1-MPC} = \\\\frac{1}{1-0.8} = 5$. Change in income $\\\\Delta Y = k \\\\times \\\\Delta I = 5 \\\\times 500 = ₹2,500$ crores."
}

EXAMPLE - Assertion-Reason:
{
  "text": "Assertion (A): Fiscal deficit is a better indicator of government borrowing than revenue deficit.\\nReason (R): Fiscal deficit includes both revenue and capital account borrowings.",
  "option_a": "Both A and R are correct, and R is the correct explanation of A",
  "option_b": "Both A and R are correct, but R is NOT the correct explanation of A",
  "option_c": "A is correct but R is incorrect",
  "option_d": "A is incorrect but R is correct",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "Fiscal deficit = Total expenditure − Total receipts (excluding borrowings). It captures the total borrowing requirement including both revenue and capital deficits, making it comprehensive. R correctly explains why."
}

DIFFICULTY: ${Math.ceil(count * 0.3)} easy, ${Math.ceil(count * 0.4)} medium, ${Math.floor(count * 0.3)} hard

Return ONLY valid JSON array with: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET HISTORY-SPECIFIC PROMPTS ===
    const cuetHistorySystemPrompt = `You are India's TOP NTA CUET-UG History question paper setter with 20+ years experience.

YOUR MISSION: Create MCQs matching NTA CUET-UG History section based on NCERT Class 12 "Themes in Indian History" Parts I, II, III.

NTA CUET-UG HISTORY QUESTION TYPES:
1. SOURCE-BASED (30%): Present a historical source/text extract and ask inference questions
2. CONCEPTUAL (25%): Test understanding of historical themes, causes, consequences
3. ASSERTION-REASON (15%): Cause-effect relationships in historical events
4. MAP/CHRONOLOGY-BASED (15%): Timeline ordering, locate events/kingdoms
5. ANALYTICAL (15%): Compare perspectives, evaluate historiographical debates

TOPICS: Harappan Civilization, Mauryan Empire, Bhakti-Sufi Traditions, Mughal Empire, Colonial India, Partition, Constitutional Making

${subjectGuidelines}

QUALITY RULES:
✓ All facts must be historically accurate and aligned with NCERT
✓ Source-based questions must use plausible historical text excerpts
✓ Dates and chronology must be verified
✓ Distractors must be plausible historical alternatives`;

    const cuetHistoryUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET History, chapter: "${chapterName}".

MATCH NTA CUET-UG PATTERN:
- 30% Source-based (present extract, ask inference)
- 25% Conceptual (themes, causes, consequences)
- 15% Assertion-Reason
- 15% Chronology/Map-based
- 15% Analytical (compare, evaluate)

EXAMPLE - Source-based:
{
  "text": "Read the source: 'The Great Bath at Mohenjodaro was a large rectangular tank in a courtyard surrounded by a corridor on all four sides.' What does this suggest about the Harappan civilization?",
  "option_a": "They had advanced knowledge of water management and possibly ritualistic bathing practices",
  "option_b": "They used the structure as a swimming pool for entertainment",
  "option_c": "It was a water storage tank for irrigation purposes",
  "option_d": "The structure served as a marketplace",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "The elaborate construction of the Great Bath with waterproofing (bitumen layer) and drainage suggests ritual/ceremonial bathing rather than utilitarian purposes. Historians believe it had religious significance in Harappan culture."
}

EXAMPLE - Assertion-Reason:
{
  "text": "Assertion (A): Ashoka adopted the policy of Dhamma after the Kalinga War.\\nReason (R): The massive destruction in the Kalinga War deeply affected Ashoka.",
  "option_a": "Both A and R are correct, and R is the correct explanation of A",
  "option_b": "Both A and R are correct, but R is NOT the correct explanation of A",
  "option_c": "A is correct but R is incorrect",
  "option_d": "A is incorrect but R is correct",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "The Kalinga War (261 BCE) resulted in massive casualties (~100,000 killed). This carnage profoundly affected Ashoka, leading him to embrace Buddhism and propagate Dhamma (moral law) as state policy."
}

DIFFICULTY: ${Math.ceil(count * 0.3)} easy, ${Math.ceil(count * 0.4)} medium, ${Math.floor(count * 0.3)} hard

Return ONLY valid JSON array with: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET POLITICAL SCIENCE-SPECIFIC PROMPTS ===
    const cuetPolSciSystemPrompt = `You are India's TOP NTA CUET-UG Political Science question paper setter with 20+ years experience.

YOUR MISSION: Create MCQs matching NTA CUET-UG Political Science section based on NCERT Class 12 "Politics in India since Independence" and "Contemporary World Politics".

NTA CUET-UG POLITICAL SCIENCE QUESTION TYPES:
1. CONCEPTUAL (30%): Political theories, constitutional provisions, ideologies
2. ASSERTION-REASON (20%): Test understanding of political cause-effect
3. CASE/EVENT-BASED (20%): Analyze specific political events, movements, judgments
4. CONSTITUTIONAL PROVISIONS (15%): Articles, amendments, fundamental rights/duties
5. COMPARATIVE (15%): Compare political systems, ideologies, international relations

TOPICS: Cold War Era, NAM, End of Bipolarity, US Hegemony, Contemporary Centres of Power, International Organizations, Globalization, Indian Politics (1947-present), Challenges of Nation Building, Crisis of Democratic Order, Regional Aspirations, Recent Developments

${subjectGuidelines}

QUALITY RULES:
✓ Constitutional articles and amendment numbers must be accurate
✓ Political events must be dated correctly
✓ Present multiple perspectives on contested political issues
✓ Distractors must be plausible political interpretations`;

    const cuetPolSciUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET Political Science, chapter: "${chapterName}".

MATCH NTA CUET-UG PATTERN:
- 30% Conceptual (theories, provisions, ideologies)
- 20% Assertion-Reason
- 20% Case/Event-based
- 15% Constitutional provisions
- 15% Comparative

EXAMPLE - Constitutional:
{
  "text": "Which Article of the Indian Constitution provides for the Right to Constitutional Remedies?",
  "option_a": "Article 32",
  "option_b": "Article 21",
  "option_c": "Article 19",
  "option_d": "Article 14",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "Article 32 provides the Right to Constitutional Remedies, which Dr. B.R. Ambedkar called the 'heart and soul' of the Constitution. It allows citizens to approach the Supreme Court for enforcement of Fundamental Rights."
}

EXAMPLE - Assertion-Reason:
{
  "text": "Assertion (A): India adopted a policy of Non-Alignment during the Cold War.\\nReason (R): India wanted to maintain strategic autonomy and not join any military bloc.",
  "option_a": "Both A and R are correct, and R is the correct explanation of A",
  "option_b": "Both A and R are correct, but R is NOT the correct explanation of A",
  "option_c": "A is correct but R is incorrect",
  "option_d": "A is incorrect but R is correct",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "India's Non-Alignment policy under Nehru was driven by the desire to maintain independent foreign policy and not get drawn into US-Soviet rivalry. This strategic autonomy allowed India to receive aid from both blocs."
}

DIFFICULTY: ${Math.ceil(count * 0.3)} easy, ${Math.ceil(count * 0.4)} medium, ${Math.floor(count * 0.3)} hard

Return ONLY valid JSON array with: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // === CUET GENERAL TEST-SPECIFIC PROMPTS ===
    const cuetGeneralTestSystemPrompt = `You are India's TOP NTA CUET-UG General Test question paper setter with 20+ years experience.

YOUR MISSION: Create MCQs matching NTA CUET-UG General Test section covering General Knowledge, Current Affairs, Mental Ability, Numerical Ability, and General English.

NTA CUET-UG GENERAL TEST QUESTION TYPES:
1. GENERAL KNOWLEDGE & CURRENT AFFAIRS (30%): Static GK, awards, sports, geography, science facts, important dates
2. MENTAL/LOGICAL ABILITY (30%): Series completion, coding-decoding, blood relations, direction sense, syllogisms, Venn diagrams, analogies
3. NUMERICAL ABILITY (25%): Simplification, percentages, profit-loss, ratio-proportion, time-speed-distance, averages, SI/CI
4. GENERAL ENGLISH (15%): Basic grammar, vocabulary, fill-in-the-blanks, error spotting

${subjectGuidelines}

QUALITY RULES:
✓ GK facts must be current and accurate
✓ Logical reasoning must have ONE unambiguous correct answer
✓ Numerical problems must be solvable with basic arithmetic
✓ English questions must test practical usage`;

    const cuetGeneralTestUserPrompt = `Generate exactly ${count} NTA CUET-UG STYLE MCQs for CUET General Test, topic: "${chapterName}".

MATCH THE TOPIC:
- "General Knowledge" / "Current Affairs" → factual GK, awards, geography, science
- "Mental Ability" / "Logical Reasoning" → series, coding, analogies, syllogisms
- "Numerical Ability" / "Quantitative Aptitude" → arithmetic, percentages, ratios
- "General English" → grammar, vocabulary, sentence correction

EXAMPLE - Logical Reasoning:
{
  "text": "In a certain code, COMPUTER is written as RFUVQNPD. How will SCIENCE be written in that code?",
  "option_a": "FDOFJDT",
  "option_b": "FDOFJDU",
  "option_c": "EDOFJDT",
  "option_d": "FDOFJCT",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "Each letter is replaced by the letter that comes after it in reverse alphabetical position. C→F, O→D, M→O... Following the same pattern for SCIENCE gives FDOFJDT."
}

EXAMPLE - Numerical:
{
  "text": "A shopkeeper marks an item 40% above cost price and offers a 20% discount. What is his profit percentage?",
  "option_a": "12%",
  "option_b": "20%",
  "option_c": "15%",
  "option_d": "8%",
  "correct_answer": 1,
  "difficulty": "easy",
  "explanation": "Let CP = ₹100. MP = ₹140 (40% above). SP = 140 × 0.80 = ₹112 (20% discount). Profit = 112 − 100 = ₹12. Profit% = 12%. Option B ignores the discount effect."
}

EXAMPLE - GK:
{
  "text": "The Tropic of Cancer passes through how many Indian states?",
  "option_a": "8",
  "option_b": "6",
  "option_c": "7",
  "option_d": "9",
  "correct_answer": 1,
  "difficulty": "medium",
  "explanation": "The Tropic of Cancer (23.5°N) passes through 8 Indian states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura, and Mizoram."
}

DIFFICULTY: ${Math.ceil(count * 0.3)} easy, ${Math.ceil(count * 0.4)} medium, ${Math.floor(count * 0.3)} hard

Return ONLY valid JSON array with: text, option_a, option_b, option_c, option_d, correct_answer (1-4), difficulty, explanation.`;

    // Select prompts based on subject detection
    let systemPrompt: string;
    let userPrompt: string;

    if (isGerman) {
      systemPrompt = germanSystemPrompt;
      userPrompt = germanUserPrompt;
    } else if (isCuetPhysics) {
      systemPrompt = cuetPhysicsSystemPrompt;
      userPrompt = cuetPhysicsUserPrompt;
    } else if (isCuetChemistry) {
      systemPrompt = cuetChemistrySystemPrompt;
      userPrompt = cuetChemistryUserPrompt;
    } else if (isCuetMath) {
      systemPrompt = cuetMathSystemPrompt;
      userPrompt = cuetMathUserPrompt;
    } else if (isCuetBiology) {
      systemPrompt = cuetBiologySystemPrompt;
      userPrompt = cuetBiologyUserPrompt;
    } else if (isCuetEconomics) {
      systemPrompt = cuetEconomicsSystemPrompt;
      userPrompt = cuetEconomicsUserPrompt;
    } else if (isCuetHistory) {
      systemPrompt = cuetHistorySystemPrompt;
      userPrompt = cuetHistoryUserPrompt;
    } else if (isCuetPolSci) {
      systemPrompt = cuetPolSciSystemPrompt;
      userPrompt = cuetPolSciUserPrompt;
    } else if (isCuetGeneralTest) {
      systemPrompt = cuetGeneralTestSystemPrompt;
      userPrompt = cuetGeneralTestUserPrompt;
    } else if (isCuetEnglish) {
      systemPrompt = cuetEnglishSystemPrompt;
      userPrompt = cuetEnglishUserPrompt;
    } else if (isEnglish) {
      systemPrompt = englishSystemPrompt;
      userPrompt = englishUserPrompt;
    } else if (isEconomics) {
      systemPrompt = economicsSystemPrompt;
      userPrompt = economicsUserPrompt;
    } else {
      systemPrompt = defaultSystemPrompt;
      userPrompt = defaultUserPrompt;
    }

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
