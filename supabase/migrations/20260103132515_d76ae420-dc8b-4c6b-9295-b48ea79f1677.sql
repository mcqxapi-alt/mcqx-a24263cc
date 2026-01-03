-- MCQX Database Schema

-- Create enum for question source
CREATE TYPE public.question_source AS ENUM ('verified', 'ai');

-- Create enum for question status
CREATE TYPE public.question_status AS ENUM ('active', 'flagged', 'retired');

-- Create enum for challenge status
CREATE TYPE public.challenge_status AS ENUM ('open', 'closed');

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chapters table
CREATE TABLE public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(subject_id, name)
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer INT NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
    explanation TEXT,
    source public.question_source NOT NULL DEFAULT 'verified',
    status public.question_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table (for authenticated users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    streak_days INT NOT NULL DEFAULT 0,
    last_practice_date DATE,
    total_attempts INT NOT NULL DEFAULT 0,
    total_correct INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sessions table (practice sessions)
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    question_ids UUID[] NOT NULL,
    answers INT[] NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    verified_count INT NOT NULL DEFAULT 0,
    ai_count INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reports table (flagged questions)
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, question_id)
);

-- Create challenges table
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    question_ids UUID[] NOT NULL,
    challenger_score INT,
    opponent_score INT,
    status public.challenge_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Public read access for subjects, chapters, questions (anyone can practice)
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Anyone can view chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Anyone can view active questions" ON public.questions FOR SELECT USING (status = 'active');

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions policies
CREATE POLICY "Users can view their own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reports policies (anyone can report, but only see their own)
CREATE POLICY "Anyone can create reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can manage their bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- Challenges policies
CREATE POLICY "Users can view challenges they're part of" ON public.challenges FOR SELECT 
    USING (auth.uid() = challenger_id OR auth.uid() = opponent_id OR status = 'open');
CREATE POLICY "Users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Users can update challenges they're part of" ON public.challenges FOR UPDATE 
    USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_chapters_subject_id ON public.chapters(subject_id);
CREATE INDEX idx_questions_chapter_id ON public.questions(chapter_id);
CREATE INDEX idx_questions_status ON public.questions(status);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX idx_challenges_challenger_id ON public.challenges(challenger_id);
CREATE INDEX idx_challenges_opponent_id ON public.challenges(opponent_id);

-- ===== INSERT ALL CLASS 12 CBSE SUBJECTS AND CHAPTERS =====

-- Physics
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Physics', '⚡', 1);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Electric Charges and Fields', 1),
    ('Electrostatic Potential and Capacitance', 2),
    ('Current Electricity', 3),
    ('Moving Charges and Magnetism', 4),
    ('Magnetism and Matter', 5),
    ('Electromagnetic Induction', 6),
    ('Alternating Current', 7),
    ('Electromagnetic Waves', 8),
    ('Ray Optics and Optical Instruments', 9),
    ('Wave Optics', 10),
    ('Dual Nature of Radiation and Matter', 11),
    ('Atoms', 12),
    ('Nuclei', 13),
    ('Semiconductor Electronics', 14)
) AS c(name, ord) WHERE s.name = 'Physics';

-- Chemistry
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Chemistry', '🧪', 2);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('The Solid State', 1),
    ('Solutions', 2),
    ('Electrochemistry', 3),
    ('Chemical Kinetics', 4),
    ('Surface Chemistry', 5),
    ('General Principles of Isolation of Elements', 6),
    ('The p-Block Elements', 7),
    ('The d- and f-Block Elements', 8),
    ('Coordination Compounds', 9),
    ('Haloalkanes and Haloarenes', 10),
    ('Alcohols, Phenols and Ethers', 11),
    ('Aldehydes, Ketones and Carboxylic Acids', 12),
    ('Amines', 13),
    ('Biomolecules', 14),
    ('Polymers', 15),
    ('Chemistry in Everyday Life', 16)
) AS c(name, ord) WHERE s.name = 'Chemistry';

-- Mathematics
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Mathematics', '📐', 3);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Relations and Functions', 1),
    ('Inverse Trigonometric Functions', 2),
    ('Matrices', 3),
    ('Determinants', 4),
    ('Continuity and Differentiability', 5),
    ('Application of Derivatives', 6),
    ('Integrals', 7),
    ('Application of Integrals', 8),
    ('Differential Equations', 9),
    ('Vector Algebra', 10),
    ('Three Dimensional Geometry', 11),
    ('Linear Programming', 12),
    ('Probability', 13)
) AS c(name, ord) WHERE s.name = 'Mathematics';

-- Biology
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Biology', '🧬', 4);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Reproduction in Organisms', 1),
    ('Sexual Reproduction in Flowering Plants', 2),
    ('Human Reproduction', 3),
    ('Reproductive Health', 4),
    ('Principles of Inheritance and Variation', 5),
    ('Molecular Basis of Inheritance', 6),
    ('Evolution', 7),
    ('Human Health and Disease', 8),
    ('Strategies for Enhancement in Food Production', 9),
    ('Microbes in Human Welfare', 10),
    ('Biotechnology: Principles and Processes', 11),
    ('Biotechnology and its Applications', 12),
    ('Organisms and Populations', 13),
    ('Ecosystem', 14),
    ('Biodiversity and Conservation', 15),
    ('Environmental Issues', 16)
) AS c(name, ord) WHERE s.name = 'Biology';

-- English
INSERT INTO public.subjects (name, icon, display_order) VALUES ('English', '📚', 5);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('The Last Lesson', 1),
    ('Lost Spring', 2),
    ('Deep Water', 3),
    ('The Rattrap', 4),
    ('Indigo', 5),
    ('Poets and Pancakes', 6),
    ('The Interview', 7),
    ('Going Places', 8),
    ('My Mother at Sixty-six', 9),
    ('An Elementary School Classroom', 10),
    ('Keeping Quiet', 11),
    ('A Thing of Beauty', 12),
    ('Aunt Jennifer''s Tigers', 13),
    ('The Third Level', 14),
    ('The Tiger King', 15),
    ('The Enemy', 16)
) AS c(name, ord) WHERE s.name = 'English';

-- Computer Science
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Computer Science', '💻', 6);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Python Revision Tour', 1),
    ('Functions in Python', 2),
    ('File Handling in Python', 3),
    ('Data Structures in Python', 4),
    ('Computer Networks', 5),
    ('Database Concepts', 6),
    ('SQL', 7),
    ('Interface Python with MySQL', 8),
    ('Data Communication', 9),
    ('Network Security', 10)
) AS c(name, ord) WHERE s.name = 'Computer Science';

-- Accountancy
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Accountancy', '📊', 7);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Accounting for Not-for-Profit Organisation', 1),
    ('Accounting for Partnership: Basic Concepts', 2),
    ('Reconstitution of Partnership', 3),
    ('Dissolution of Partnership Firm', 4),
    ('Accounting for Share Capital', 5),
    ('Issue and Redemption of Debentures', 6),
    ('Financial Statements of a Company', 7),
    ('Analysis of Financial Statements', 8),
    ('Accounting Ratios', 9),
    ('Cash Flow Statement', 10)
) AS c(name, ord) WHERE s.name = 'Accountancy';

-- Business Studies
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Business Studies', '💼', 8);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Nature and Significance of Management', 1),
    ('Principles of Management', 2),
    ('Business Environment', 3),
    ('Planning', 4),
    ('Organising', 5),
    ('Staffing', 6),
    ('Directing', 7),
    ('Controlling', 8),
    ('Financial Management', 9),
    ('Financial Markets', 10),
    ('Marketing Management', 11),
    ('Consumer Protection', 12)
) AS c(name, ord) WHERE s.name = 'Business Studies';

-- Economics
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Economics', '📈', 9);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Introduction to Macroeconomics', 1),
    ('National Income Accounting', 2),
    ('Money and Banking', 3),
    ('Determination of Income and Employment', 4),
    ('Government Budget and the Economy', 5),
    ('Open Economy Macroeconomics', 6),
    ('Indian Economy on the Eve of Independence', 7),
    ('Indian Economy 1950-1990', 8),
    ('Liberalisation, Privatisation and Globalisation', 9),
    ('Poverty', 10),
    ('Human Capital Formation in India', 11),
    ('Rural Development', 12),
    ('Employment', 13),
    ('Infrastructure', 14),
    ('Environment and Sustainable Development', 15)
) AS c(name, ord) WHERE s.name = 'Economics';

-- History
INSERT INTO public.subjects (name, icon, display_order) VALUES ('History', '🏛️', 10);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Bricks, Beads and Bones', 1),
    ('Kings, Farmers and Towns', 2),
    ('Kinship, Caste and Class', 3),
    ('Thinkers, Beliefs and Buildings', 4),
    ('Through the Eyes of Travellers', 5),
    ('Bhakti-Sufi Traditions', 6),
    ('An Imperial Capital: Vijayanagara', 7),
    ('Peasants, Zamindars and the State', 8),
    ('Kings and Chronicles', 9),
    ('Colonialism and the Countryside', 10),
    ('Rebels and the Raj', 11),
    ('Colonial Cities', 12),
    ('Mahatma Gandhi and the Nationalist Movement', 13),
    ('Understanding Partition', 14),
    ('Framing the Constitution', 15)
) AS c(name, ord) WHERE s.name = 'History';

-- Political Science
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Political Science', '🏛️', 11);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('The Cold War Era', 1),
    ('The End of Bipolarity', 2),
    ('US Hegemony in World Politics', 3),
    ('Alternative Centres of Power', 4),
    ('Contemporary South Asia', 5),
    ('International Organisations', 6),
    ('Security in the Contemporary World', 7),
    ('Environment and Natural Resources', 8),
    ('Globalisation', 9),
    ('Challenges of Nation Building', 10),
    ('Era of One-Party Dominance', 11),
    ('Politics of Planned Development', 12),
    ('India''s External Relations', 13),
    ('Challenges to the Congress System', 14),
    ('Crisis of Democratic Order', 15),
    ('Rise of Popular Movements', 16),
    ('Regional Aspirations', 17),
    ('Recent Developments in Indian Politics', 18)
) AS c(name, ord) WHERE s.name = 'Political Science';

-- Geography
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Geography', '🌍', 12);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Human Geography: Nature and Scope', 1),
    ('The World Population', 2),
    ('Population Composition', 3),
    ('Human Development', 4),
    ('Primary Activities', 5),
    ('Secondary Activities', 6),
    ('Tertiary and Quaternary Activities', 7),
    ('Transport and Communication', 8),
    ('International Trade', 9),
    ('Human Settlements', 10),
    ('Population: Distribution, Density, Growth', 11),
    ('Migration', 12),
    ('Human Resources', 13),
    ('Land Resources and Agriculture', 14),
    ('Water Resources', 15),
    ('Mineral and Energy Resources', 16),
    ('Manufacturing Industries', 17),
    ('Planning and Sustainable Development', 18),
    ('Transport and Communication in India', 19),
    ('International Trade of India', 20)
) AS c(name, ord) WHERE s.name = 'Geography';

-- Psychology
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Psychology', '🧠', 13);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Variations in Psychological Attributes', 1),
    ('Self and Personality', 2),
    ('Meeting Life Challenges', 3),
    ('Psychological Disorders', 4),
    ('Therapeutic Approaches', 5),
    ('Attitude and Social Cognition', 6),
    ('Social Influence and Group Processes', 7),
    ('Psychology and Life', 8),
    ('Developing Psychological Skills', 9)
) AS c(name, ord) WHERE s.name = 'Psychology';

-- Physical Education
INSERT INTO public.subjects (name, icon, display_order) VALUES ('Physical Education', '🏃', 14);
INSERT INTO public.chapters (subject_id, name, display_order) 
SELECT s.id, c.name, c.ord FROM public.subjects s, 
(VALUES 
    ('Planning in Sports', 1),
    ('Sports and Nutrition', 2),
    ('Yoga and Lifestyle', 3),
    ('Physical Education and Sports for CWSN', 4),
    ('Children and Women in Sports', 5),
    ('Test and Measurement in Sports', 6),
    ('Physiology and Injuries in Sports', 7),
    ('Biomechanics and Sports', 8),
    ('Psychology and Sports', 9),
    ('Training in Sports', 10)
) AS c(name, ord) WHERE s.name = 'Physical Education';