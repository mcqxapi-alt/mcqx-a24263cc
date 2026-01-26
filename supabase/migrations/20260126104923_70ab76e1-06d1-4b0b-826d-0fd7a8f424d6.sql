
-- Delete existing German chapters
DELETE FROM public.chapters 
WHERE subject_id = (SELECT id FROM public.subjects WHERE name = 'German');

-- Insert the correct 5 grammar topics from Section C-Applied Grammar
INSERT INTO public.chapters (subject_id, name, display_order)
SELECT s.id, chapter.name, chapter.display_order
FROM public.subjects s
CROSS JOIN (VALUES
  ('Passive Voice (Passiv Präsens, Passiv Präteritum)', 1),
  ('Subordinate Clauses (als ob, da, falls, sodass, statt dass, statt...zu)', 2),
  ('Adjektiv und Participle as Nouns', 3),
  ('Future Tense (Futur I - werden + Infinitiv)', 4),
  ('Personal Pronouns in Accusative and Dative Case', 5)
) AS chapter(name, display_order)
WHERE s.name = 'German';
