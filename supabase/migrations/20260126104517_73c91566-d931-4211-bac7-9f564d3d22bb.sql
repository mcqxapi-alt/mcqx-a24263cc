
-- Add German as a new subject
INSERT INTO public.subjects (name, icon, display_order)
VALUES ('German', '🇩🇪', 16);

-- Add German grammar chapters for Class 12 CBSE boards
INSERT INTO public.chapters (subject_id, name, display_order)
SELECT s.id, chapter.name, chapter.display_order
FROM public.subjects s
CROSS JOIN (VALUES
  ('Passiv (Präsens und Präteritum)', 1),
  ('Konjunktiv II', 2),
  ('Relativsätze', 3),
  ('Infinitivsätze mit zu', 4),
  ('Nebensätze (weil, dass, wenn, obwohl)', 5),
  ('Adjektivdeklination', 6),
  ('Präpositionen mit Akkusativ und Dativ', 7),
  ('Verben mit Präpositionen', 8),
  ('Indirekte Fragen', 9),
  ('Komparativ und Superlativ', 10),
  ('Perfekt und Präteritum', 11),
  ('Textproduktion (Brief, E-Mail, Dialog)', 12)
) AS chapter(name, display_order)
WHERE s.name = 'German';
