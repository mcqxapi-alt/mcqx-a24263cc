import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Check,
  X,
  Sparkles,
  Flag,
  Loader2,
  Target,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  GraduationCap,
  Trophy,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSecureQuestions, QuestionPublic } from "@/hooks/useSecureQuestions";
import { useSmartQuestions, QuestionWithRecycled } from "@/hooks/useSmartQuestions";
import { useAdaptiveDifficulty, DifficultyLevel } from "@/hooks/useAdaptiveDifficulty";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/practice/DifficultyBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RichText } from "@/components/RichText";
import mcqxLogo from "@/assets/mcqx-logo.png";
import { PracticeResult } from "@/components/practice/PracticeResult";

type Subject = {
  id: string;
  name: string;
  icon: string;
  class_id: string | null;
};

type Chapter = {
  id: string;
  name: string;
  subject_id: string;
};

type BoardRecord = {
  id: string;
  name: string;
  type: string;
  icon: string;
  display_order: number;
};

type ClassRecord = {
  id: string;
  board_id: string;
  name: string;
  display_order: number;
};

// Extended question type that includes validated answer data, recycled flag, and difficulty
type Question = QuestionWithRecycled & {
  correct_answer?: number;
  explanation?: string | null;
  difficulty?: DifficultyLevel;
};

type Step = "category" | "board" | "class" | "subject" | "chapter" | "practice" | "result";

type CategoryType = "board" | "competitive" | "state";

const categories = [
  { type: "board" as CategoryType, label: "Board Exams", description: "CBSE, ICSE & more", icon: GraduationCap, color: "from-primary/20 to-primary/5" },
  { type: "competitive" as CategoryType, label: "Competitive Exams", description: "JEE, NEET, CUET & more", icon: Trophy, color: "from-accent/20 to-accent/5" },
  { type: "state" as CategoryType, label: "State Boards", description: "State-level board exams", icon: MapPin, color: "from-secondary/40 to-secondary/10" },
];

export default function Practice() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { validateAnswer, clearCache } = useSecureQuestions();
  const [shownPowerUserToast, setShownPowerUserToast] = useState(false);
  const [shownDifficultyUpToast, setShownDifficultyUpToast] = useState(false);
  const { fetchSmartQuestions, recordQuestionProgress, incrementRecycleCount } = useSmartQuestions();
  const { updateDifficultyState, getDifficultyStats, currentDifficulty } = useAdaptiveDifficulty();
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedBoard, setSelectedBoard] = useState<BoardRecord | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previousDifficulty, setPreviousDifficulty] = useState<DifficultyLevel>("medium");
  const guestSeenIds = useRef<Set<string>>(new Set());
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const { toast } = useToast();

  // Fetch boards
  const { data: boards = [], isLoading: loadingBoards } = useQuery({
    queryKey: ["boards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("boards").select("*").order("display_order");
      if (error) throw error;
      return data as BoardRecord[];
    },
  });

  // Fetch classes for selected board
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["classes", selectedBoard?.id],
    queryFn: async () => {
      if (!selectedBoard) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("board_id", selectedBoard.id)
        .order("display_order");
      if (error) throw error;
      return data as ClassRecord[];
    },
    enabled: !!selectedBoard,
  });

  // Fetch subjects for selected class
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ["subjects", selectedClass?.id],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("class_id", selectedClass.id)
        .order("display_order");
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!selectedClass,
  });

  // Fetch all subjects (for URL param shortcut)
  const { data: allSubjects = [] } = useQuery({
    queryKey: ["all-subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("display_order");
      if (error) throw error;
      return data as Subject[];
    },
  });

  // Auto-select subject from URL param
  useEffect(() => {
    const subjectParam = searchParams.get("subject");
    if (subjectParam && allSubjects.length > 0 && !selectedSubject) {
      const found = allSubjects.find((s) => s.id === subjectParam);
      if (found) {
        setSelectedSubject(found);
        setStep("chapter");
      }
    }
  }, [searchParams, allSubjects, selectedSubject]);

  // Auto-skip board step if only one board for category
  useEffect(() => {
    if (step === "board" && selectedCategory && !loadingBoards) {
      const filtered = boards.filter((b) => b.type === selectedCategory);
      if (filtered.length === 1) {
        setSelectedBoard(filtered[0]);
        setStep("class");
      }
    }
  }, [step, selectedCategory, boards, loadingBoards]);

  // Fetch chapters for selected subject
  const { data: chapters = [], isLoading: loadingChapters } = useQuery({
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

  // Get correct answer - only available after validation
  const getCorrectIndex = (q?: Question | null) => {
    if (!q?.correct_answer && q?.correct_answer !== 0) return null;
    const raw = Number(q.correct_answer);
    if (!Number.isFinite(raw)) return null;
    if (raw >= 0 && raw <= 3) return raw;
    return null;
  };

  const question = questions[currentQ];
  const correctIndex = question ? getCorrectIndex(question) : null;
  const isCorrect = selectedAnswer !== null && correctIndex !== null && selectedAnswer === correctIndex;
  
  const score = answers.filter((a, i) => {
    const q = questions[i];
    const cIdx = getCorrectIndex(q);
    return a !== null && cIdx !== null && a === cIdx;
  }).length;
  const totalQuestions = questions.length;
  const accuracy = answers.length > 0 ? Math.round((score / answers.length) * 100) : 0;

  const handleCategorySelect = (type: CategoryType) => {
    setSelectedCategory(type);
    setStep("board");
  };

  const handleBoardSelect = (board: BoardRecord) => {
    setSelectedBoard(board);
    setStep("class");
  };

  const handleClassSelect = (cls: ClassRecord) => {
    setSelectedClass(cls);
    setStep("subject");
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setStep("chapter");
  };

  const handleChapterSelect = async (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsGenerating(true);
    clearCache();

    const targetCount = 10;

    try {
      const { questions: fetchedQuestions, isPowerUser } = await fetchSmartQuestions(
        user?.id || null,
        chapter.id,
        chapter.name,
        selectedSubject?.name || "",
        targetCount
      );

      if (fetchedQuestions.length > 0) {
        if (!user) {
          fetchedQuestions.forEach(q => guestSeenIds.current.add(q.id));
        }

        if (isPowerUser && !shownPowerUserToast) {
          setShownPowerUserToast(true);
          toast({
            title: "🎉 Power User Unlocked!",
            description: "You've mastered 100+ questions in this chapter. We'll mix in review questions to strengthen your memory.",
          });
        }

        setQuestions(fetchedQuestions as Question[]);
        setStep("practice");
        setCurrentQ(0);
        setAnswers([]);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        toast({
          title: "No more questions available",
          description: user 
            ? "You've practiced all available questions for this chapter! Great job!" 
            : "No questions available for this chapter yet.",
        });
      }
    } catch (err) {
      console.error("Error fetching questions:", err);
      toast({
        title: "Error loading questions",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || !question) return;
    setIsValidating(true);
    
    try {
      const result = await validateAnswer(question.id, selectedAnswer);
      
      const updatedQuestions = [...questions];
      updatedQuestions[currentQ] = {
        ...question,
        correct_answer: result.correct_answer,
        explanation: result.explanation,
      };
      setQuestions(updatedQuestions);
      
      setShowResult(true);
      setAnswers([...answers, selectedAnswer]);

      if (user && selectedChapter) {
        recordQuestionProgress(
          user.id,
          question.id,
          selectedChapter.id,
          result.is_correct
        );

        if (question.difficulty) {
          const prevDiff = currentDifficulty;
          const newDifficulty = await updateDifficultyState(
            user.id,
            selectedChapter.id,
            question.difficulty,
            result.is_correct
          );
          
          if (newDifficulty !== prevDiff) {
            setPreviousDifficulty(prevDiff);
            if (newDifficulty === "hard" && prevDiff === "medium" && !shownDifficultyUpToast) {
              setShownDifficultyUpToast(true);
              toast({
                title: "🔥 Difficulty Increased!",
                description: "You're crushing it! Moving to harder questions.",
              });
            } else if (newDifficulty === "medium" && prevDiff === "easy") {
              toast({
                title: "📈 Level Up!",
                description: "Nice progress! Medium difficulty unlocked.",
              });
            }
          }
        }

        if (question.is_recycled) {
          incrementRecycleCount(user.id, question.id);
        }
      }
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

  const saveSession = async () => {
    if (!user || !selectedChapter || questions.length === 0) return;

    try {
      const verifiedCount = questions.filter(q => q.source === 'verified').length;
      const aiCount = questions.filter(q => q.source === 'ai').length;

      const { error: sessionError } = await supabase.from("sessions").insert({
        user_id: user.id,
        chapter_id: selectedChapter.id,
        question_ids: questions.map(q => q.id),
        answers: answers,
        score: score,
        total_questions: totalQuestions,
        verified_count: verifiedCount,
        ai_count: aiCount,
      });

      if (sessionError) {
        console.error("Error saving session:", sessionError);
        return;
      }

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("total_attempts, total_correct, streak_days, last_practice_date")
        .eq("id", user.id)
        .single();

      if (currentProfile) {
        const today = new Date().toISOString().split('T')[0];
        const lastPractice = currentProfile.last_practice_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        let newStreak = currentProfile.streak_days;
        if (lastPractice === yesterday) {
          newStreak = currentProfile.streak_days + 1;
        } else if (lastPractice !== today) {
          newStreak = 1;
        }

        await supabase
          .from("profiles")
          .update({
            total_attempts: (currentProfile.total_attempts || 0) + totalQuestions,
            total_correct: (currentProfile.total_correct || 0) + score,
            streak_days: newStreak,
            last_practice_date: today,
          })
          .eq("id", user.id);
      }
    } catch (err) {
      console.error("Error saving session data:", err);
    }
  };

  const handleNext = () => {
    if (currentQ < totalQuestions - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      saveSession();
      setStep("result");
    }
  };

  const handleRestart = () => {
    setStep("category");
    setSelectedCategory(null);
    setSelectedBoard(null);
    setSelectedClass(null);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setQuestions([]);
    guestSeenIds.current.clear();
    setCurrentQ(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleRetryChapter = () => {
    if (selectedChapter) {
      setQuestions([]);
      setCurrentQ(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setShowResult(false);
      handleChapterSelect(selectedChapter);
    }
  };

  const goBack = () => {
    if (step === "board") {
      setStep("category");
      setSelectedCategory(null);
      setSelectedBoard(null);
    } else if (step === "class") {
      // If auto-skipped board, go back to category
      const filtered = selectedCategory ? boards.filter((b) => b.type === selectedCategory) : [];
      if (filtered.length <= 1) {
        setStep("category");
        setSelectedCategory(null);
        setSelectedBoard(null);
      } else {
        setStep("board");
        setSelectedBoard(null);
      }
      setSelectedClass(null);
    } else if (step === "subject") {
      setStep("class");
      setSelectedSubject(null);
      setSelectedClass(null);
    } else if (step === "chapter") {
      // If came from URL param, go back to category
      if (searchParams.get("subject")) {
        setStep("category");
        setSelectedCategory(null);
        setSelectedBoard(null);
        setSelectedClass(null);
        setSelectedSubject(null);
      } else {
        setStep("subject");
        setSelectedSubject(null);
      }
    } else if (step === "practice") {
      setStep("chapter");
      setSelectedChapter(null);
      setQuestions([]);
    }
  };

  const handleReportQuestion = async () => {
    if (!question || !reportReason.trim()) return;
    
    setIsReporting(true);
    try {
      const { error } = await supabase.from("reports").insert({
        question_id: question.id,
        user_id: user?.id || null,
        reason: reportReason.trim(),
      });
      
      if (error) throw error;
      
      toast({
        title: "Report submitted",
        description: "Thanks for helping us improve! We'll review this question.",
      });
      setReportDialogOpen(false);
      setReportReason("");
    } catch (err) {
      console.error("Error submitting report:", err);
      toast({
        title: "Failed to submit report",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsReporting(false);
    }
  };

  const getOptions = (q: Question) => [q.option_a, q.option_b, q.option_c, q.option_d];

  const progressPercent = totalQuestions > 0 ? ((currentQ + 1) / totalQuestions) * 100 : 0;

  // Build breadcrumb
  const breadcrumbParts: string[] = [];
  if (selectedCategory) {
    const cat = categories.find(c => c.type === selectedCategory);
    if (cat) breadcrumbParts.push(cat.label);
  }
  if (selectedBoard) breadcrumbParts.push(selectedBoard.name);
  if (selectedClass) breadcrumbParts.push(selectedClass.name);

  const showBackButton = step !== "category" && step !== "result";

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh-animated opacity-60" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
        <div className="container flex items-center justify-between h-16 sm:h-18">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={goBack}
                className="p-2 hover:bg-secondary rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-105">
              <img src={mcqxLogo} alt="MCQX" className="h-24 sm:h-[7.5rem] w-auto" />
            </Link>
          </div>

          {/* Breadcrumb */}
          {breadcrumbParts.length > 0 && step !== "practice" && step !== "result" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              {breadcrumbParts.map((part, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                  <span className={i === breadcrumbParts.length - 1 ? "text-foreground font-medium" : ""}>{part}</span>
                </span>
              ))}
            </motion.div>
          )}

          {/* Session Info */}
          {step === "practice" && totalQuestions > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4"
            >
              <div className="hidden sm:block text-center">
                <div className="text-xs text-muted-foreground">
                  {selectedSubject?.name} • {selectedChapter?.name}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Q</span>{" "}
                  <span className="font-semibold">{currentQ + 1}</span>
                  <span className="text-muted-foreground">/{totalQuestions}</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <motion.div 
                  key={score}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1"
                >
                  <Target className="w-4 h-4 text-accent" />
                  <span className="font-bold neon-text-green">{score}</span>
                </motion.div>
              </div>
            </motion.div>
          )}

          {user && (
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex transition-all duration-300 hover:bg-secondary">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="relative pt-20 sm:pt-24 pb-12 px-4 min-h-screen">
        <div className="container max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Category Selection */}
            {step === "category" && (
              <motion.div
                key="category"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4"
                  >
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-sm">Start Practicing</span>
                  </motion.div>
                  <h1 className="font-display text-4xl font-bold mb-2">Choose Your Path</h1>
                  <p className="text-muted-foreground">Select the type of exam you're preparing for</p>
                </div>

                <div className="grid gap-4">
                  {categories.map((cat, index) => (
                    <motion.button
                      key={cat.type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCategorySelect(cat.type)}
                      className="relative glass rounded-2xl p-6 text-left transition-all duration-300 hover:border-primary/50 group overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      <div className="relative flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <cat.icon className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">
                            {cat.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Board Selection */}
            {step === "board" && selectedCategory && (
              <motion.div
                key="board"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="font-display text-3xl font-bold mb-2">Select Board</h1>
                  <p className="text-muted-foreground">Choose your examination board</p>
                </div>

                {loadingBoards ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading boards...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {boards.filter(b => b.type === selectedCategory).map((board, index) => (
                      <motion.button
                        key={board.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01, x: 6 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleBoardSelect(board)}
                        className="w-full glass rounded-xl p-5 text-left transition-all duration-300 hover:border-primary/50 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-display font-semibold text-lg group-hover:text-primary transition-colors">
                            {board.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </motion.button>
                    ))}
                    {boards.filter(b => b.type === selectedCategory).length === 0 && (
                      <div className="text-center py-12 glass rounded-2xl">
                        <p className="text-muted-foreground">Coming soon! We're adding content for this category.</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Class Selection */}
            {step === "class" && selectedBoard && (
              <motion.div
                key="class"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="font-display text-3xl font-bold mb-2">{selectedBoard.name}</h1>
                  <p className="text-muted-foreground">Select your class</p>
                </div>

                {loadingClasses ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading classes...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {classes.map((cls, index) => (
                      <motion.button
                        key={cls.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.4 }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleClassSelect(cls)}
                        className="relative glass rounded-2xl p-6 text-center transition-all duration-300 hover:border-primary/50 group overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative">
                          <GraduationCap className="w-8 h-8 mx-auto mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          <h3 className="font-display text-lg font-semibold group-hover:text-primary transition-colors">
                            {cls.name}
                          </h3>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Subject Selection */}
            {step === "subject" && (
              <motion.div
                key="subject"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="font-display text-4xl font-bold mb-2">Pick a Subject</h1>
                  <p className="text-muted-foreground">Choose what you want to practice</p>
                </div>

                {loadingSubjects ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="relative">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <div className="absolute inset-0 blur-xl bg-primary/30 animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">Loading subjects...</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-12 glass rounded-2xl">
                    <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No subjects available for this class yet. Coming soon!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {subjects.map((subject, index) => (
                      <motion.button
                        key={subject.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSubjectSelect(subject)}
                        className="relative glass rounded-2xl p-6 text-left transition-all duration-300 hover:border-primary/50 group overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <span className="text-4xl mb-3 block relative transition-transform duration-300 group-hover:scale-110">{subject.icon}</span>
                        <h3 className="font-display text-base font-semibold group-hover:text-primary transition-colors duration-300 relative">
                          {subject.name}
                        </h3>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Chapter Selection */}
            {step === "chapter" && selectedSubject && (
              <motion.div
                key="chapter"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="text-6xl mb-4"
                  >
                    {selectedSubject.icon}
                  </motion.div>
                  <h1 className="font-display text-3xl font-bold mb-2">{selectedSubject.name}</h1>
                  <p className="text-muted-foreground">Select a chapter to practice</p>
                </div>

                {loadingChapters || isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="relative">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <div className="absolute inset-0 blur-xl bg-primary/30 animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isGenerating ? "Generating questions with AI..." : "Loading chapters..."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chapters.map((chapter, index) => (
                      <motion.button
                        key={chapter.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.01, x: 6 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleChapterSelect(chapter)}
                        className="w-full glass rounded-xl p-5 text-left transition-all duration-300 hover:border-primary/50 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300">
                            {index + 1}
                          </span>
                          <span className="font-medium group-hover:text-primary transition-colors duration-300">
                            {chapter.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Practice Mode */}
            {step === "practice" && question && (
              <motion.div
                key={`question-${currentQ}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <motion.span
                      key={progressPercent}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                    >
                      {Math.round(progressPercent)}%
                    </motion.span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full progress-glow"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>

                {/* Question Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative glass rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:border-primary/30"
                  style={{
                    boxShadow: "0 0 40px hsl(var(--neon-cyan) / 0.1)",
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary animate-gradient" />
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      Question {currentQ + 1}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {question.difficulty && (
                        <DifficultyBadge difficulty={question.difficulty} />
                      )}
                      {question.is_recycled && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.15 }}
                        >
                          <Badge variant="secondary" className="text-xs gap-1">
                            <RotateCcw className="w-3 h-3" />
                            Review
                          </Badge>
                        </motion.div>
                      )}
                      {question.source === "ai" && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.2 }}
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          AI
                        </motion.span>
                      )}
                    </div>
                  </div>
                  <RichText as="p" className="text-lg sm:text-xl leading-relaxed font-medium" text={question.text} />
                </motion.div>

                {/* Options */}
                <div className="space-y-3">
                  {getOptions(question).map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    const isSelected = selectedAnswer === index;
                    const isCorrectAnswer = index === correctIndex;
                    const isWrong = showResult && isSelected && !isCorrectAnswer;
                    const showCorrect = showResult && isCorrectAnswer;

                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={!showResult ? { scale: 1.01, x: 6 } : {}}
                        whileTap={!showResult ? { scale: 0.99 } : {}}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showResult}
                        className={`relative w-full glass rounded-xl p-4 text-left transition-all duration-300 cursor-pointer flex items-center gap-4 overflow-hidden ${
                          showCorrect
                            ? "border-accent bg-accent/10"
                            : isWrong
                            ? "border-destructive bg-destructive/10"
                            : isSelected
                            ? "border-primary bg-primary/10"
                            : "hover:border-primary/50"
                        }`}
                        style={
                          showCorrect
                            ? { boxShadow: "0 0 25px hsl(var(--neon-green) / 0.4)" }
                            : isWrong
                            ? { boxShadow: "0 0 25px hsl(0 84% 60% / 0.4)" }
                            : isSelected
                            ? { boxShadow: "0 0 25px hsl(var(--neon-cyan) / 0.3)" }
                            : {}
                        }
                      >
                        {showCorrect && (
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 bg-gradient-to-r from-accent/20 to-transparent origin-left"
                          />
                        )}
                        <motion.span
                          animate={showCorrect ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.3 }}
                          className={`relative z-10 w-10 h-10 rounded-lg flex items-center justify-center font-bold shrink-0 transition-all duration-300 ${
                            showCorrect
                              ? "bg-accent text-accent-foreground"
                              : isWrong
                              ? "bg-destructive text-destructive-foreground"
                              : isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {showCorrect ? (
                            <Check className="w-5 h-5" />
                          ) : isWrong ? (
                            <X className="w-5 h-5" />
                          ) : (
                            letter
                          )}
                         </motion.span>
                         <RichText as="span" className="relative z-10 flex-1 text-base" text={option} />
                       </motion.button>
                    );
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: 10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`rounded-xl p-5 border ${
                          isCorrect
                            ? "bg-accent/5 border-accent/30"
                            : "bg-destructive/5 border-destructive/30"
                        }`}
                      >
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-3 mb-3"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isCorrect ? "bg-accent/20" : "bg-destructive/20"
                            }`}
                          >
                            {isCorrect ? (
                              <Check className="w-5 h-5 text-accent" />
                            ) : (
                              <X className="w-5 h-5 text-destructive" />
                            )}
                          </div>
                          <span
                            className={`text-xl font-bold ${
                              isCorrect ? "text-accent" : "text-destructive"
                            }`}
                          >
                            {isCorrect ? "Correct!" : "Incorrect"}
                          </span>
                         </motion.div>
                         <RichText
                           as="p"
                           className="text-muted-foreground leading-relaxed"
                           text={question.explanation || "Keep practicing to master this topic!"}
                         />
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  {!showResult ? (
                    <Button
                      variant="neon"
                      size="lg"
                      className="flex-1 h-14 text-lg"
                      onClick={handleSubmit}
                      disabled={selectedAnswer === null || isValidating}
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-1"
                    >
                      <Button
                        variant="neon"
                        size="lg"
                        className="w-full h-14 text-lg"
                        onClick={handleNext}
                      >
                        {currentQ < totalQuestions - 1 ? "Next Question" : "See Results"}
                        <ChevronRight className="w-5 h-5 ml-1" />
                      </Button>
                    </motion.div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-14 w-14 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setReportDialogOpen(true)}
                    title="Report wrong answer"
                  >
                    <Flag className="w-5 h-5" />
                  </Button>

                  {/* Report Dialog */}
                  <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                    <DialogContent className="glass border-border/50">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          Report Wrong Answer
                        </DialogTitle>
                        <DialogDescription>
                          Help us improve by reporting inaccurate or incorrect questions.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <Textarea
                          placeholder="Describe what's wrong with this question (e.g., incorrect answer, wrong explanation, unclear options...)"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          className="min-h-[100px] bg-secondary/50"
                        />
                        <div className="flex gap-3 justify-end">
                          <Button
                            variant="ghost"
                            onClick={() => setReportDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleReportQuestion}
                            disabled={!reportReason.trim() || isReporting}
                          >
                            {isReporting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit Report"
                            )}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {step === "result" && (
              <PracticeResult
                score={score}
                totalQuestions={totalQuestions}
                accuracy={accuracy}
                questions={questions}
                answers={answers}
                selectedSubject={selectedSubject}
                selectedChapter={selectedChapter}
                user={user}
                isGenerating={isGenerating}
                onRetryChapter={handleRetryChapter}
                onNewChapter={handleRestart}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
