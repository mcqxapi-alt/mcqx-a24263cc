import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  X,
  Sparkles,
  Loader2,
  Trophy,
  Target,
  Swords,
  Copy,
  Users,
  Clock,
  Zap,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSecureQuestions, QuestionPublic } from "@/hooks/useSecureQuestions";
import { useToast } from "@/hooks/use-toast";
import mcqxLogo from "@/assets/mcqx-logo.png";

type Subject = {
  id: string;
  name: string;
  icon: string;
};

type Chapter = {
  id: string;
  name: string;
  subject_id: string;
};

// Extended question type that includes validated answer data
type Question = QuestionPublic & {
  correct_answer?: number;
  explanation?: string | null;
};

type Challenge = {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  chapter_id: string;
  question_ids: string[];
  challenger_score: number | null;
  opponent_score: number | null;
  status: "open" | "closed";
  created_at: string;
  completed_at: string | null;
};

type Step = "menu" | "subject" | "chapter" | "waiting" | "play" | "result";

export default function Challenge() {
  const { id: challengeId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { validateAnswer, clearCache } = useSecureQuestions();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>("menu");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [opponentProfile, setOpponentProfile] = useState<{ display_name: string | null } | null>(null);
  const [challengerProfile, setChallengerProfile] = useState<{ display_name: string | null } | null>(null);
  const [chapterInfo, setChapterInfo] = useState<{ name: string; subject_name: string } | null>(null);

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Subject[];
    },
  });

  // Fetch chapters for selected subject
  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", selectedSubject?.id],
    queryFn: async () => {
      if (!selectedSubject) return [];
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("subject_id", selectedSubject.id)
        .order("display_order");
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!selectedSubject,
  });

  // Load challenge if ID in URL
  useEffect(() => {
    if (challengeId && user) {
      loadChallenge(challengeId);
    }
  }, [challengeId, user]);

  const loadChallenge = async (id: string) => {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast({ title: "Challenge not found", variant: "destructive" });
      navigate("/challenge");
      return;
    }

    setChallenge(data);

    // Load chapter info
    const { data: chapterData } = await supabase
      .from("chapters")
      .select("name, subjects(name)")
      .eq("id", data.chapter_id)
      .single();
    
    if (chapterData) {
      setChapterInfo({
        name: chapterData.name,
        subject_name: (chapterData.subjects as any)?.name || "",
      });
    }

    // Load profiles
    const { data: challengerData } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", data.challenger_id)
      .single();
    setChallengerProfile(challengerData);

    if (data.opponent_id) {
      const { data: opponentData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.opponent_id)
        .single();
      setOpponentProfile(opponentData);
    }

    // If user is opponent and hasn't played yet
    if (data.opponent_id === user?.id && data.opponent_score === null) {
      await loadQuestionsAndPlay(data);
      return;
    }

    // If user is challenger and waiting for opponent
    if (data.challenger_id === user?.id && !data.opponent_id) {
      setStep("waiting");
      return;
    }

    // If challenge is complete, show results
    if (data.status === "closed" || (data.challenger_score !== null && data.opponent_score !== null)) {
      setStep("result");
      return;
    }

    // If user is challenger and hasn't played yet
    if (data.challenger_id === user?.id && data.challenger_score === null) {
      await loadQuestionsAndPlay(data);
      return;
    }

    // User is opponent but challenge not joined yet
    if (!data.opponent_id && data.challenger_id !== user?.id) {
      setIsJoining(true);
      const { error: joinError } = await supabase
        .from("challenges")
        .update({ opponent_id: user?.id })
        .eq("id", data.id);

      if (joinError) {
        toast({ title: "Failed to join challenge", variant: "destructive" });
        setIsJoining(false);
        return;
      }

      setChallenge({ ...data, opponent_id: user?.id || null });
      setIsJoining(false);
      await loadQuestionsAndPlay({ ...data, opponent_id: user?.id || null });
    }
  };

  const loadQuestionsAndPlay = async (challengeData: Challenge) => {
    clearCache(); // Clear any cached answer validations
    
    // Fetch questions using secure RPC (no correct_answer exposed)
    const { data: questionsData, error } = await supabase.rpc("get_questions_by_ids", {
      p_question_ids: challengeData.question_ids,
    });

    if (error || !questionsData || questionsData.length === 0) {
      toast({ title: "Failed to load questions", variant: "destructive" });
      return;
    }

    // Sort questions by the order in question_ids
    const orderedQuestions = challengeData.question_ids
      .map(id => questionsData.find((q: any) => q.id === id))
      .filter(Boolean) as Question[];

    setQuestions(orderedQuestions);
    setStep("play");
    setCurrentQ(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleCreateChallenge = async (chapter: Chapter) => {
    if (!user) {
      navigate("/login", { state: { from: `/challenge` } });
      return;
    }

    setIsCreating(true);
    setSelectedChapter(chapter);
    clearCache();

    // Fetch questions using secure RPC
    const { data: questionsData, error: questionsError } = await supabase.rpc("get_public_questions", {
      p_chapter_id: chapter.id,
      p_limit: 20,
    });

    if (questionsError) {
      toast({ title: "Failed to load questions", variant: "destructive" });
      setIsCreating(false);
      return;
    }

    let allQuestions = questionsData || [];
    const targetCount = 10;

    // If we don't have enough questions, generate AI ones and store them in DB
    if (allQuestions.length < targetCount) {
      try {
        const neededCount = Math.max(5, targetCount - allQuestions.length);
        const { data: aiData, error: aiError } = await supabase.functions.invoke(
          "generate-mcqs",
          {
            body: {
              chapterId: chapter.id,
              chapterName: chapter.name,
              subjectName: selectedSubject?.name,
              count: neededCount,
            },
          }
        );

        if (aiError) {
          console.error("Error generating AI questions:", aiError);
        } else if (aiData?.questions && Array.isArray(aiData.questions) && aiData.questions.length > 0) {
          // The backend function persists generated questions and returns them with DB ids.
          // Merge them into the current pool.
          allQuestions = [...allQuestions, ...(aiData.questions as any[])];
        }
      } catch (err) {
        console.error("Failed to generate AI questions:", err);
      }
    }

    if (allQuestions.length < 5) {
      toast({ 
        title: "Unable to load questions", 
        description: "Please try again or select a different chapter.",
        variant: "destructive" 
      });
      setIsCreating(false);
      return;
    }

    // Shuffle and take 5-10 questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(10, shuffled.length));
    const selectedIds = selectedQuestions.map((q: any) => q.id);

    // Create challenge
    const { data: newChallenge, error: createError } = await supabase
      .from("challenges")
      .insert({
        challenger_id: user.id,
        chapter_id: chapter.id,
        question_ids: selectedIds,
        status: "open",
      })
      .select()
      .single();

    if (createError || !newChallenge) {
      toast({ title: "Failed to create challenge", variant: "destructive" });
      setIsCreating(false);
      return;
    }

    // Store questions in state for immediate use (without correct_answer)
    setQuestions(selectedQuestions as Question[]);
    setChallenge(newChallenge);
    setChapterInfo({ name: chapter.name, subject_name: selectedSubject?.name || "" });
    setIsCreating(false);
    navigate(`/challenge/${newChallenge.id}`);
    setStep("waiting");
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/challenge/${challenge?.id}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied!", description: "Share it with your friend to start the battle!" });
  };

  // Get correct answer - only available after validation
  const getCorrectIndex = (q?: Question | null) => {
    if (!q?.correct_answer && q?.correct_answer !== 0) return null;
    const raw = Number(q.correct_answer);
    if (!Number.isFinite(raw)) return null;
    if (raw >= 0 && raw <= 3) return raw;
    return null;
  };

  const question = questions[currentQ] ?? null;
  const correctIndex = question ? getCorrectIndex(question) : null;
  const isCorrect = selectedAnswer !== null && correctIndex !== null && selectedAnswer === correctIndex;
  
  // Score only counts questions that have been validated
  const score = answers.filter((a, i) => {
    const q = questions[i];
    const cIdx = getCorrectIndex(q);
    return a !== null && cIdx !== null && a === cIdx;
  }).length;

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || !question) return;
    setIsValidating(true);
    
    try {
      // Validate answer server-side
      const result = await validateAnswer(question.id, selectedAnswer);
      
      // Update the question with the correct answer and explanation
      const updatedQuestions = [...questions];
      updatedQuestions[currentQ] = {
        ...question,
        correct_answer: result.correct_answer,
        explanation: result.explanation,
      };
      setQuestions(updatedQuestions);
      
      setShowResult(true);
      setAnswers([...answers, selectedAnswer]);
    } catch (err) {
      console.error("Error validating answer:", err);
      toast({
        title: "Error validating answer",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Submit score - count only validated answers
      const finalScore = answers.filter((a, i) => {
        const q = questions[i];
        const cIdx = getCorrectIndex(q);
        return a !== null && cIdx !== null && a === cIdx;
      }).length;

      const isChallenger = challenge?.challenger_id === user?.id;
      const updateField = isChallenger ? "challenger_score" : "opponent_score";

      const updateData: any = { [updateField]: finalScore };
      
      // Check if both scores will be complete after this update
      const otherScore = isChallenger ? challenge?.opponent_score : challenge?.challenger_score;
      if (otherScore !== null) {
        updateData.status = "closed";
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from("challenges")
        .update(updateData)
        .eq("id", challenge?.id);

      // Refresh challenge data
      const { data: updatedChallenge } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challenge?.id)
        .single();

      if (updatedChallenge) {
        setChallenge(updatedChallenge);
      }

      setStep("result");
    }
  };

  const getOptions = (q: Question) => [q.option_a, q.option_b, q.option_c, q.option_d];

  const goBack = () => {
    if (step === "chapter") {
      setStep("subject");
      setSelectedSubject(null);
    } else if (step === "subject") {
      setStep("menu");
    }
  };

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh-animated">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-primary/30 animate-pulse-ring" />
          <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Enhanced animated background */}
      <div className="fixed inset-0 gradient-mesh-animated" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      
      {/* Floating orbs */}
      <div className="orb orb-cyan w-[500px] h-[500px] -top-64 -left-64 opacity-60" />
      <div className="orb orb-green w-[400px] h-[400px] -bottom-48 -right-48 opacity-50" style={{ animationDelay: '7s' }} />
      <div className="orb orb-purple w-[300px] h-[300px] top-1/3 right-1/4 opacity-40" style={{ animationDelay: '14s' }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
        <div className="container flex items-center justify-between h-24 sm:h-32 px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {(step === "subject" || step === "chapter") && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={goBack}
                className="p-1.5 sm:p-2 hover:bg-secondary rounded-lg transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>
            )}
            <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-105">
              <img src={mcqxLogo} alt="MCQX" className="h-20 sm:h-28 w-auto" />
            </Link>
          </div>

          {step === "play" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 sm:gap-4"
            >
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-muted-foreground">Q</span>{" "}
                  <span className="font-semibold">{currentQ + 1}</span>
                  <span className="text-muted-foreground">/{questions.length}</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                  <span className="font-bold neon-text-green">{score}</span>
                </div>
              </div>
            </motion.div>
          )}

          <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm px-2 sm:px-3">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="relative pt-32 sm:pt-40 pb-12 px-4 min-h-screen">
        <div className="container max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Menu */}
            {step === "menu" && !challengeId && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-10"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card mb-6"
                  >
                    <Swords className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">1v1 Quiz Battle</span>
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="font-display text-5xl font-bold mb-3"
                  >
                    Challenge <span className="text-gradient-animated">Mode</span>
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground text-lg"
                  >
                    Create a challenge and battle your friends!
                  </motion.p>
                </div>

                <motion.div 
                  className="grid gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("subject")}
                    className="glass-card rounded-2xl p-7 text-left group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                        <Zap className="w-8 h-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-2xl font-semibold mb-1 group-hover:text-primary transition-colors duration-300">
                          Create Challenge
                        </h3>
                        <p className="text-muted-foreground">
                          Pick a chapter and challenge a friend
                        </p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
                    </div>
                  </motion.button>
                </motion.div>

                {/* Active Challenges */}
                {user && <ActiveChallenges userId={user.id} />}
              </motion.div>
            )}

            {/* Subject Selection */}
            {step === "subject" && (
              <motion.div
                key="subject"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <div className="text-center mb-10">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-5xl font-bold mb-3"
                  >
                    Pick a Subject
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-muted-foreground text-lg"
                  >
                    Choose the battlefield
                  </motion.p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {subjects.map((subject, index) => (
                    <motion.button
                      key={subject.id}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: index * 0.05, 
                        duration: 0.4, 
                        ease: [0.16, 1, 0.3, 1] 
                      }}
                      whileHover={{ scale: 1.05, y: -6 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setStep("chapter");
                      }}
                      className="glass-card rounded-2xl p-6 text-left group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="text-5xl mb-4 block relative group-hover:scale-110 transition-transform duration-300">{subject.icon}</span>
                      <h3 className="font-display text-base font-semibold group-hover:text-primary transition-colors duration-300 relative">
                        {subject.name}
                      </h3>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Chapter Selection */}
            {step === "chapter" && selectedSubject && (
              <motion.div
                key="chapter"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-8"
              >
                <div className="text-center mb-10">
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="text-7xl mb-4"
                  >
                    {selectedSubject.icon}
                  </motion.div>
                  <h1 className="font-display text-4xl font-bold mb-2">{selectedSubject.name}</h1>
                  <p className="text-muted-foreground text-lg">Select a chapter to battle on</p>
                </div>

                {isCreating ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 gap-6"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 blur-2xl bg-primary/40 animate-pulse-ring" />
                      <Loader2 className="w-12 h-12 animate-spin text-primary relative" />
                    </div>
                    <p className="text-muted-foreground font-medium">Creating challenge...</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {chapters.map((chapter, index) => (
                      <motion.button
                        key={chapter.id}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: index * 0.04, 
                          duration: 0.4,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        whileHover={{ scale: 1.02, x: 8 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCreateChallenge(chapter)}
                        className="w-full glass-card rounded-xl p-5 text-left flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
                            {index + 1}
                          </span>
                          <span className="font-medium text-lg group-hover:text-primary transition-colors duration-300">
                            {chapter.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Waiting for Opponent */}
            {step === "waiting" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-center py-16"
              >
                <motion.div
                  className="relative w-32 h-32 mx-auto mb-10"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-4 border-dashed border-primary/40"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-2 rounded-full border-2 border-dotted border-accent/30"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Users className="w-12 h-12 text-primary animate-pulse" />
                  </div>
                </motion.div>

                <h2 className="font-display text-4xl font-bold mb-3">Waiting for Opponent</h2>
                <p className="text-primary font-medium mb-2">
                  {chapterInfo && `${chapterInfo.subject_name} • ${chapterInfo.name}`}
                </p>
                <p className="text-muted-foreground mb-10">
                  Share the link below with a friend to start the battle!
                </p>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card rounded-2xl p-5 mb-8 flex items-center gap-4 max-w-lg mx-auto"
                >
                  <input
                    readOnly
                    value={`${window.location.origin}/challenge/${challenge?.id}`}
                    className="flex-1 bg-transparent text-sm truncate outline-none font-mono"
                  />
                  <Button variant="neon" size="sm" onClick={copyShareLink} className="shrink-0">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </motion.div>

                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-muted-foreground flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4 text-primary" />
                  Challenge expires in 24 hours
                </motion.p>
              </motion.div>
            )}

            {/* Play */}
            {step === "play" && question && (
              <motion.div
                key="play"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Progress */}
                <div className="relative h-3 rounded-full bg-secondary/50 overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent progress-glow rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                {/* Question */}
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, y: 30, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card rounded-3xl p-8"
                >
                  <div className="flex items-start gap-5 mb-8">
                    <span className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {currentQ + 1}
                    </span>
                    <p className="text-xl leading-relaxed pt-2">{question.text}</p>
                  </div>

                  <div className="space-y-4">
                    {getOptions(question).map((option, index) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrectOption = index === correctIndex;
                      let variant = "default";
                      if (showResult) {
                        if (isCorrectOption) variant = "correct";
                        else if (isSelected && !isCorrectOption) variant = "wrong";
                      }

                      return (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08, duration: 0.4 }}
                          whileHover={!showResult ? { scale: 1.02, x: 4 } : {}}
                          whileTap={!showResult ? { scale: 0.98 } : {}}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={showResult}
                          className={`w-full p-5 rounded-2xl text-left transition-all duration-400 flex items-center gap-4 ${
                            variant === "correct"
                              ? "bg-green-500/20 border-2 border-green-500 shadow-[0_0_30px_hsl(var(--neon-green)/0.3)]"
                              : variant === "wrong"
                              ? "bg-red-500/20 border-2 border-red-500 shadow-[0_0_30px_hsl(0_84%_60%/0.3)]"
                              : isSelected
                              ? "glass-card border-2 border-primary shadow-[0_0_30px_hsl(var(--primary)/0.2)]"
                              : "glass-card"
                          }`}
                        >
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                            variant === "correct"
                              ? "bg-green-500 text-white"
                              : variant === "wrong"
                              ? "bg-red-500 text-white"
                              : isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary group-hover:bg-primary/20"
                          }`}>
                            {variant === "correct" ? <Check className="w-5 h-5" /> : 
                             variant === "wrong" ? <X className="w-5 h-5" /> : 
                             String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-lg">{option}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Explanation */}
                {showResult && question.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="glass-card rounded-2xl p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold text-lg">Explanation</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{question.explanation}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <motion.div 
                  className="flex gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {!showResult ? (
                    <Button
                      variant="neon"
                      size="lg"
                      className="flex-1 h-14 text-lg"
                      disabled={selectedAnswer === null || isValidating}
                      onClick={handleSubmit}
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        "Submit Answer"
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="neon"
                      size="lg"
                      className="flex-1 h-14 text-lg group"
                      onClick={handleNext}
                    >
                      {currentQ < questions.length - 1 ? "Next Question" : "See Results"}
                      <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Result */}
            {step === "result" && challenge && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <ChallengeResult
                  challenge={challenge}
                  userId={user?.id || ""}
                  challengerProfile={challengerProfile}
                  opponentProfile={opponentProfile}
                  chapterInfo={chapterInfo}
                />

                <div className="flex gap-3 justify-center mt-8">
                  <Button variant="neon-outline" size="lg" asChild>
                    <Link to="/challenge">New Challenge</Link>
                  </Button>
                  <Button variant="neon" size="lg" asChild>
                    <Link to="/practice">Practice More</Link>
                  </Button>
                </div>

                {/* Guest Sign-In Nudge */}
                {!user && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card rounded-xl p-5 flex items-center justify-between gap-4 mt-6 mx-auto max-w-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Save this battle!</p>
                        <p className="text-sm text-muted-foreground">
                          Sign in to track your wins
                        </p>
                      </div>
                    </div>
                    <Button variant="neon" size="sm" asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Active Challenges Component
function ActiveChallenges({ userId }: { userId: string }) {
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["active-challenges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(`
          *,
          chapters(name, subjects(name))
        `)
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return null;
  if (challenges.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg font-semibold">Recent Challenges</h3>
      <div className="space-y-3">
        {challenges.map((c: any) => {
          const isChallenger = c.challenger_id === userId;
          const myScore = isChallenger ? c.challenger_score : c.opponent_score;
          const theirScore = isChallenger ? c.opponent_score : c.challenger_score;
          const isComplete = c.status === "closed";
          const isWaiting = !c.opponent_id && isChallenger;
          const needsToPlay = (isChallenger && c.challenger_score === null) || 
                             (!isChallenger && c.opponent_score === null);

          return (
            <Link
              key={c.id}
              to={`/challenge/${c.id}`}
              className="glass rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition-all duration-300 block"
            >
              <div>
                <p className="font-medium">
                  {(c.chapters as any)?.subjects?.name} • {(c.chapters as any)?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isWaiting
                    ? "Waiting for opponent..."
                    : isComplete
                    ? `${myScore} - ${theirScore}`
                    : needsToPlay
                    ? "Your turn to play!"
                    : "In progress..."}
                </p>
              </div>
              {isComplete && (
                <div className={`text-sm font-semibold ${
                  myScore > theirScore ? "text-green-500" : 
                  myScore < theirScore ? "text-red-500" : "text-muted-foreground"
                }`}>
                  {myScore > theirScore ? "Won" : myScore < theirScore ? "Lost" : "Draw"}
                </div>
              )}
              {needsToPlay && !isWaiting && (
                <Button variant="neon" size="sm">Play</Button>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// Challenge Result Component
function ChallengeResult({ 
  challenge, 
  userId, 
  challengerProfile, 
  opponentProfile,
  chapterInfo 
}: { 
  challenge: Challenge; 
  userId: string;
  challengerProfile: { display_name: string | null } | null;
  opponentProfile: { display_name: string | null } | null;
  chapterInfo: { name: string; subject_name: string } | null;
}) {
  const isChallenger = challenge.challenger_id === userId;
  const myScore = isChallenger ? challenge.challenger_score : challenge.opponent_score;
  const theirScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;
  const isWinner = myScore !== null && theirScore !== null && myScore > theirScore;
  const isDraw = myScore === theirScore;
  const isComplete = challenge.status === "closed" || (myScore !== null && theirScore !== null);

  return (
    <div className="space-y-6">
      {isComplete ? (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            {isWinner ? (
              <Crown className="w-20 h-20 mx-auto text-yellow-500" />
            ) : isDraw ? (
              <Swords className="w-20 h-20 mx-auto text-primary" />
            ) : (
              <Trophy className="w-20 h-20 mx-auto text-muted-foreground" />
            )}
          </motion.div>

          <h2 className="font-display text-4xl font-bold">
            {isWinner ? (
              <span className="text-yellow-500">Victory!</span>
            ) : isDraw ? (
              <span className="text-primary">It's a Draw!</span>
            ) : (
              <span className="text-muted-foreground">Defeated</span>
            )}
          </h2>

          {chapterInfo && (
            <p className="text-muted-foreground">
              {chapterInfo.subject_name} • {chapterInfo.name}
            </p>
          )}

          <div className="flex items-center justify-center gap-8 py-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {isChallenger ? "You" : (challengerProfile?.display_name || "Challenger")}
              </p>
              <p className="font-display text-4xl font-bold neon-text">
                {isChallenger ? myScore : theirScore}
              </p>
            </div>
            <div className="text-2xl font-bold text-muted-foreground">vs</div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {!isChallenger ? "You" : (opponentProfile?.display_name || "Opponent")}
              </p>
              <p className="font-display text-4xl font-bold neon-text">
                {!isChallenger ? myScore : theirScore}
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <Trophy className="w-20 h-20 mx-auto text-primary" />
          <h2 className="font-display text-3xl font-bold">Challenge Complete!</h2>
          <p className="text-muted-foreground">
            Your score: <span className="font-bold text-primary">{myScore}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Waiting for opponent to complete...
          </p>
        </>
      )}
    </div>
  );
}
