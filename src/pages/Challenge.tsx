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
import { useToast } from "@/hooks/use-toast";
import mcqxLogo from "@/assets/mcqx-logo.jpg";

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

type Question = {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: number;
  explanation: string | null;
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
    const { data: questionsData, error } = await supabase
      .from("questions")
      .select("*")
      .in("id", challengeData.question_ids);

    if (error || !questionsData) {
      toast({ title: "Failed to load questions", variant: "destructive" });
      return;
    }

    // Sort questions by the order in question_ids
    const orderedQuestions = challengeData.question_ids
      .map(id => questionsData.find(q => q.id === id))
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
      toast({ title: "Please sign in to create a challenge", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    setSelectedChapter(chapter);

    // Fetch questions for this chapter
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id")
      .eq("chapter_id", chapter.id)
      .eq("status", "active")
      .limit(10);

    if (questionsError || !questionsData || questionsData.length < 5) {
      toast({ 
        title: "Not enough questions", 
        description: "This chapter needs at least 5 verified questions for challenges.",
        variant: "destructive" 
      });
      setIsCreating(false);
      return;
    }

    // Shuffle and take 5-10 questions
    const shuffled = questionsData.sort(() => Math.random() - 0.5);
    const selectedIds = shuffled.slice(0, Math.min(10, shuffled.length)).map(q => q.id);

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

  const getCorrectIndex = (q?: Question | null) => {
    const raw = Number(q?.correct_answer);
    if (!Number.isFinite(raw)) return 0;
    if (raw >= 1 && raw <= 4) return raw - 1;
    if (raw >= 0 && raw <= 3) return raw;
    return 0;
  };

  const question = questions[currentQ];
  const correctIndex = question ? getCorrectIndex(question) : 0;
  const isCorrect = selectedAnswer !== null && selectedAnswer === correctIndex;
  const score = answers.filter((a, i) => a !== null && a === getCorrectIndex(questions[i])).length;

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setShowResult(true);
    setAnswers([...answers, selectedAnswer]);
  };

  const handleNext = async () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Submit score
      const finalScore = [...answers, selectedAnswer].filter(
        (a, i) => a !== null && a === getCorrectIndex(questions[i])
      ).length;

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen gradient-mesh-animated flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-8 max-w-md text-center"
        >
          <Swords className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h1 className="font-display text-3xl font-bold mb-4">Challenge Mode</h1>
          <p className="text-muted-foreground mb-8">
            Sign in to create and join 1v1 quiz battles with your friends!
          </p>
          <Button variant="neon" size="lg" asChild>
            <Link to="/login">Sign In to Battle</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 gradient-mesh-animated opacity-60" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {(step === "subject" || step === "chapter") && (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={goBack}
                className="p-2 hover:bg-secondary rounded-lg transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-105">
              <img src={mcqxLogo} alt="MCQX" className="h-14 w-auto" />
            </Link>
          </div>

          {step === "play" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Q</span>{" "}
                  <span className="font-semibold">{currentQ + 1}</span>
                  <span className="text-muted-foreground">/{questions.length}</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="font-bold neon-text-green">{score}</span>
                </div>
              </div>
            </motion.div>
          )}

          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="relative pt-24 pb-12 px-4 min-h-screen">
        <div className="container max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Menu */}
            {step === "menu" && !challengeId && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4"
                  >
                    <Swords className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-sm">1v1 Quiz Battle</span>
                  </motion.div>
                  <h1 className="font-display text-4xl font-bold mb-2">Challenge Mode</h1>
                  <p className="text-muted-foreground">Create a challenge and battle your friends!</p>
                </div>

                <div className="grid gap-4">
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("subject")}
                    className="glass rounded-2xl p-6 text-left hover:border-primary/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Zap className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
                          Create Challenge
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Pick a chapter and challenge a friend
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                </div>

                {/* Active Challenges */}
                <ActiveChallenges userId={user.id} />
              </motion.div>
            )}

            {/* Subject Selection */}
            {step === "subject" && (
              <motion.div
                key="subject"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="font-display text-4xl font-bold mb-2">Pick a Subject</h1>
                  <p className="text-muted-foreground">Choose the battlefield</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {subjects.map((subject, index) => (
                    <motion.button
                      key={subject.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setStep("chapter");
                      }}
                      className="glass rounded-2xl p-6 text-left hover:border-primary/50 transition-all duration-300 group"
                    >
                      <span className="text-4xl mb-3 block">{subject.icon}</span>
                      <h3 className="font-display text-base font-semibold group-hover:text-primary transition-colors">
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
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">{selectedSubject.icon}</div>
                  <h1 className="font-display text-3xl font-bold mb-2">{selectedSubject.name}</h1>
                  <p className="text-muted-foreground">Select a chapter to battle on</p>
                </div>

                {isCreating ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Creating challenge...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chapters.map((chapter, index) => (
                      <motion.button
                        key={chapter.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ scale: 1.01, x: 6 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleCreateChallenge(chapter)}
                        className="w-full glass rounded-xl p-5 text-left hover:border-primary/50 flex items-center justify-between group transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </span>
                          <span className="font-medium group-hover:text-primary transition-colors">
                            {chapter.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 mx-auto mb-8 rounded-full border-4 border-dashed border-primary/50 flex items-center justify-center"
                >
                  <Users className="w-10 h-10 text-primary" />
                </motion.div>

                <h2 className="font-display text-3xl font-bold mb-2">Waiting for Opponent</h2>
                <p className="text-muted-foreground mb-2">
                  {chapterInfo && `${chapterInfo.subject_name} • ${chapterInfo.name}`}
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                  Share the link below with a friend to start the battle!
                </p>

                <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3 max-w-md mx-auto">
                  <input
                    readOnly
                    value={`${window.location.origin}/challenge/${challenge?.id}`}
                    className="flex-1 bg-transparent text-sm truncate outline-none"
                  />
                  <Button variant="neon" size="sm" onClick={copyShareLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Challenge expires in 24 hours
                </p>
              </motion.div>
            )}

            {/* Play */}
            {step === "play" && question && (
              <motion.div
                key="play"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Progress */}
                <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary progress-glow"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                {/* Question */}
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-6"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <span className="shrink-0 w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {currentQ + 1}
                    </span>
                    <p className="text-lg leading-relaxed">{question.text}</p>
                  </div>

                  <div className="space-y-3">
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
                          whileHover={!showResult ? { scale: 1.01 } : {}}
                          whileTap={!showResult ? { scale: 0.99 } : {}}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={showResult}
                          className={`w-full p-4 rounded-xl text-left transition-all duration-300 flex items-center gap-3 ${
                            variant === "correct"
                              ? "bg-green-500/20 border-2 border-green-500"
                              : variant === "wrong"
                              ? "bg-red-500/20 border-2 border-red-500"
                              : isSelected
                              ? "glass border-2 border-primary"
                              : "glass hover:border-primary/50"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                            variant === "correct"
                              ? "bg-green-500 text-white"
                              : variant === "wrong"
                              ? "bg-red-500 text-white"
                              : isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary"
                          }`}>
                            {variant === "correct" ? <Check className="w-4 h-4" /> : 
                             variant === "wrong" ? <X className="w-4 h-4" /> : 
                             String.fromCharCode(65 + index)}
                          </span>
                          <span>{option}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Explanation */}
                {showResult && question.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Explanation</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{question.explanation}</p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {!showResult ? (
                    <Button
                      variant="neon"
                      size="lg"
                      className="flex-1"
                      disabled={selectedAnswer === null}
                      onClick={handleSubmit}
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button
                      variant="neon"
                      size="lg"
                      className="flex-1"
                      onClick={handleNext}
                    >
                      {currentQ < questions.length - 1 ? "Next Question" : "See Results"}
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  )}
                </div>
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
                  userId={user.id}
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
