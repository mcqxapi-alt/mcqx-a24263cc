import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Swords,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSecureQuestions, QuestionPublic } from "@/hooks/useSecureQuestions";
import { useToast } from "@/hooks/use-toast";
import mcqxLogo from "@/assets/mcqx-logo.png";
import { useChallengeRealtime, RealtimeChallenge, ChallengeProgress } from "@/hooks/useChallengeRealtime";
import { ChallengeLobby } from "@/components/challenge/ChallengeLobby";
import { ChallengePlay } from "@/components/challenge/ChallengePlay";
import { ChallengeWait } from "@/components/challenge/ChallengeWait";
import { ChallengeResult } from "@/components/challenge/ChallengeResult";

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

type Question = QuestionPublic & {
  correct_answer?: number;
  explanation?: string | null;
};

type Step = "menu" | "subject" | "chapter" | "lobby" | "play" | "waiting" | "result";

export default function Challenge() {
  const { id: challengeId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { validateAnswer, clearCache } = useSecureQuestions();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>("menu");
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isLoadingChallenge, setIsLoadingChallenge] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [challenge, setChallenge] = useState<RealtimeChallenge | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSettingReady, setIsSettingReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [myTimeMs, setMyTimeMs] = useState(0);
  const [opponentProfile, setOpponentProfile] = useState<{ display_name: string | null } | null>(null);
  const [challengerProfile, setChallengerProfile] = useState<{ display_name: string | null } | null>(null);
  const [chapterInfo, setChapterInfo] = useState<{ name: string; subject_name: string } | null>(null);

  const isChallenger = challenge?.challenger_id === user?.id;

  // Realtime hook callbacks
  const handleChallengeUpdate = useCallback((updatedChallenge: RealtimeChallenge) => {
    setChallenge(updatedChallenge);
    
    // Check if challenge is finished
    if (updatedChallenge.status === "finished") {
      setStep("result");
    }
  }, []);

  const handleOpponentProgress = useCallback((progress: ChallengeProgress) => {
    setOpponentProgress(progress.current_question);
  }, []);

  const handleOpponentJoined = useCallback(async (opponentId: string) => {
    console.log("[Challenge] Opponent joined with ID:", opponentId);
    
    // Fetch opponent profile using the ID from the realtime event
    const { data: opponentData } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", opponentId)
      .single();
    setOpponentProfile(opponentData);
    
    // Only move to lobby if we're not already playing
    setStep(currentStep => {
      if (currentStep === "play" || currentStep === "waiting" || currentStep === "result") {
        return currentStep; // Don't interrupt gameplay
      }
      toast({ title: "Opponent joined!", description: "Get ready to battle!" });
      return "lobby";
    });
  }, [toast]);

  const handleBothReady = useCallback((startedAt: string) => {
    // Only trigger if we're still in the lobby - prevents glitches during gameplay
    setStep(currentStep => {
      if (currentStep !== "lobby") {
        console.log("[Challenge] Ignoring handleBothReady - not in lobby, current step:", currentStep);
        return currentStep;
      }
      console.log("[Challenge] Both ready! Starting game...");
      // Update local challenge state with started_at so ChallengePlay can use it
      setChallenge(prev => prev ? { ...prev, started_at: startedAt, status: "playing" } : prev);
      setIsStartingGame(true);
      // Brief delay to show "Starting Quiz..." then go to play
      setTimeout(() => {
        setIsStartingGame(false);
        setStep("play");
      }, 1500);
      return currentStep; // Keep lobby during animation
    });
  }, []);

  const handleOpponentFinished = useCallback(() => {
    // Just update state, wait screen will show their progress as complete
  }, []);

  // Setup realtime subscriptions
  const { connectionStatus, setReady, updateProgress, recordAnswer, finishChallenge, leaveDuel } = useChallengeRealtime({
    challengeId: challenge?.id || null,
    userId: user?.id || null,
    onChallengeUpdate: handleChallengeUpdate,
    onOpponentProgress: handleOpponentProgress,
    onOpponentJoined: handleOpponentJoined,
    onBothReady: handleBothReady,
    onOpponentFinished: handleOpponentFinished,
  });

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

  // Load challenge if ID in URL - works for guests too
  useEffect(() => {
    if (challengeId && !authLoading) {
      loadChallenge(challengeId);
    }
  }, [challengeId, authLoading]);

  const loadChallenge = async (id: string) => {
    setIsLoadingChallenge(true);
    
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      toast({ title: "Challenge not found", variant: "destructive" });
      setIsLoadingChallenge(false);
      navigate("/challenge");
      return;
    }

    const challengeData = data as unknown as RealtimeChallenge;
    setChallenge(challengeData);

    // Load chapter info
    const { data: chapterData } = await supabase
      .from("chapters")
      .select("name, subjects(name)")
      .eq("id", challengeData.chapter_id)
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
      .eq("id", challengeData.challenger_id)
      .single();
    setChallengerProfile(challengerData);

    if (challengeData.opponent_id) {
      const { data: opponentData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", challengeData.opponent_id)
        .single();
      setOpponentProfile(opponentData);
    }

    // Determine the correct step based on challenge state
    if (challengeData.status === "finished" || (challengeData.challenger_score !== null && challengeData.opponent_score !== null)) {
      setStep("result");
      setIsLoadingChallenge(false);
      return;
    }

    if (challengeData.status === "playing") {
      // Check if we've finished
      const myFinishedField = challengeData.challenger_id === user?.id ? "challenger_finished_at" : "opponent_finished_at";
      if (challengeData[myFinishedField]) {
        // We've finished, waiting for opponent
        const myScoreField = challengeData.challenger_id === user?.id ? "challenger_score" : "opponent_score";
        setMyScore(challengeData[myScoreField] || 0);
        setStep("waiting");
      } else {
        // Game is playing, load questions and play
        await loadQuestionsAndPlay(challengeData);
      }
      setIsLoadingChallenge(false);
      return;
    }

    if (challengeData.status === "lobby") {
      await loadQuestionsForLobby(challengeData);
      setStep("lobby");
      setIsLoadingChallenge(false);
      return;
    }

    // Challenge is open
    if (!user) {
      // Guest viewing a challenge - show join prompt
      setStep("lobby");
      setIsLoadingChallenge(false);
      return;
    }
    
    if (challengeData.challenger_id === user.id) {
      // We created this challenge
      if (!challengeData.opponent_id) {
        // Waiting for opponent to join
        await loadQuestionsForLobby(challengeData);
        setStep("lobby");
      } else {
        // Opponent joined, go to lobby
        await loadQuestionsForLobby(challengeData);
        setStep("lobby");
      }
    } else {
      // We're joining as opponent
      await joinChallenge(challengeData);
    }
    setIsLoadingChallenge(false);
  };

  const loadQuestionsForLobby = async (challengeData: RealtimeChallenge) => {
    clearCache();
    const { data: questionsData, error } = await supabase.rpc("get_questions_by_ids", {
      p_question_ids: challengeData.question_ids,
    });

    if (error || !questionsData) {
      toast({ title: "Failed to load questions", variant: "destructive" });
      return;
    }

    const orderedQuestions = challengeData.question_ids
      .map(id => questionsData.find((q: any) => q.id === id))
      .filter(Boolean) as Question[];

    setQuestions(orderedQuestions);
  };

  const joinChallenge = async (challengeData: RealtimeChallenge) => {
    setIsJoining(true);
    
    const { error: joinError } = await supabase
      .from("challenges")
      .update({ 
        opponent_id: user?.id,
        status: "lobby" 
      })
      .eq("id", challengeData.id);

    if (joinError) {
      toast({ title: "Failed to join challenge", variant: "destructive" });
      setIsJoining(false);
      return;
    }

    await loadQuestionsForLobby(challengeData);
    
    // Fetch own profile
    const { data: myProfileData } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user?.id!)
      .single();
    setOpponentProfile(myProfileData);

    setChallenge({ ...challengeData, opponent_id: user?.id || null, status: "lobby" });
    setIsJoining(false);
    setStep("lobby");
  };

  const loadQuestionsAndPlay = async (challengeData: RealtimeChallenge) => {
    clearCache();
    
    const { data: questionsData, error } = await supabase.rpc("get_questions_by_ids", {
      p_question_ids: challengeData.question_ids,
    });

    if (error || !questionsData || questionsData.length === 0) {
      toast({ title: "Failed to load questions", variant: "destructive" });
      return;
    }

    const orderedQuestions = challengeData.question_ids
      .map(id => questionsData.find((q: any) => q.id === id))
      .filter(Boolean) as Question[];

    setQuestions(orderedQuestions);
    setStep("play");
  };

  const handleCreateChallenge = async (chapter: Chapter) => {
    if (!user) {
      navigate("/login", { state: { from: `/challenge` } });
      return;
    }

    setIsCreating(true);
    setSelectedChapter(chapter);
    clearCache();

    // Fetch questions
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
    const minRequired = 5;

    // Only generate AI questions if we don't have enough to play
    // This avoids the slow AI call when we have sufficient questions
    if (allQuestions.length < minRequired) {
      try {
        const neededCount = 10; // Generate a batch for future use
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

        if (!aiError && aiData?.questions) {
          allQuestions = [...allQuestions, ...(aiData.questions as any[])];
        }
      } catch (err) {
        console.error("Failed to generate AI questions:", err);
      }
    }

    if (allQuestions.length < minRequired) {
      toast({ 
        title: "Unable to load questions", 
        description: "Please try again or select a different chapter.",
        variant: "destructive" 
      });
      setIsCreating(false);
      return;
    }

    // Shuffle and select questions
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

    // Fetch own profile
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    setChallengerProfile(myProfile);

    setQuestions(selectedQuestions as Question[]);
    setChallenge(newChallenge as unknown as RealtimeChallenge);
    setChapterInfo({ name: chapter.name, subject_name: selectedSubject?.name || "" });
    setIsCreating(false);
    navigate(`/challenge/${newChallenge.id}`);
    setStep("lobby");
  };

  const handleReady = async () => {
    if (!challenge) return;
    setIsSettingReady(true);
    const startedAt = await setReady(isChallenger);
    setIsSettingReady(false);

    // If both players are ready, show "Starting Quiz..." briefly then go to play
    if (startedAt) {
      console.log("[Challenge] Both ready! Starting game...");
      // Update local challenge state with started_at so ChallengePlay can use it
      setChallenge(prev => prev ? { ...prev, started_at: startedAt, status: "playing" } : prev);
      setIsStartingGame(true);
      setTimeout(() => {
        setIsStartingGame(false);
        setStep("play");
      }, 1500);
    }
  };

  const handleLeaveDuel = async () => {
    if (!challenge) return;
    setIsLeaving(true);
    await leaveDuel(isChallenger);
    setIsLeaving(false);
    toast({ 
      title: isChallenger ? "Duel cancelled" : "Left duel",
      description: isChallenger ? "The challenge has been closed." : "You've left the challenge."
    });
    navigate("/challenge");
  };

  const handleAnswerSubmit = async (questionIndex: number, selectedAnswer: number, timeTakenMs: number, isCorrect: boolean) => {
    if (!challenge) return;
    await updateProgress(questionIndex + 1);
    await recordAnswer(isChallenger, questionIndex, selectedAnswer, timeTakenMs, isCorrect);
  };

  const handleQuestionValidated = (questionIndex: number, correctAnswer: number, explanation: string | null) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[questionIndex] = {
        ...updated[questionIndex],
        correct_answer: correctAnswer,
        explanation,
      };
      return updated;
    });
  };

  const handleFinish = async (score: number, totalTimeMs: number) => {
    if (!challenge) return;
    
    setMyScore(score);
    setMyTimeMs(totalTimeMs);
    
    await finishChallenge(isChallenger, score, totalTimeMs);

    // Check if opponent has finished
    const opponentFinishedField = isChallenger ? "opponent_finished_at" : "challenger_finished_at";
    if (challenge[opponentFinishedField]) {
      setStep("result");
    } else {
      setStep("waiting");
    }
  };

  const goBack = () => {
    if (step === "chapter") {
      setStep("subject");
      setSelectedSubject(null);
    } else if (step === "subject") {
      setStep("menu");
    }
  };

  // Auth or challenge loading gate
  if (authLoading || isLoadingChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh-animated">
        <div className="relative">
          <div className="absolute inset-0 blur-2xl bg-primary/30 animate-pulse-ring" />
          <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
        </div>
      </div>
    );
  }

  // Guest viewing a challenge - show sign in prompt
  const isGuestViewingChallenge = !user && challengeId && challenge;
  
  if (isGuestViewingChallenge) {
    return (
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 gradient-mesh-animated" />
        <div className="fixed inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        
        {/* Floating orbs */}
        <div className="orb orb-cyan w-[500px] h-[500px] -top-64 -left-64 opacity-60" />
        <div className="orb orb-green w-[400px] h-[400px] -bottom-48 -right-48 opacity-50" style={{ animationDelay: '7s' }} />
        <div className="orb orb-purple w-[300px] h-[300px] top-1/3 right-1/4 opacity-40" style={{ animationDelay: '14s' }} />

        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-border/30">
          <div className="container flex items-center justify-between h-24 sm:h-32 px-3 sm:px-4">
            <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-105">
              <img src={mcqxLogo} alt="MCQX" className="h-20 sm:h-28 w-auto" />
            </Link>
            <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm px-2 sm:px-3">
              <Link to="/">Home</Link>
            </Button>
          </div>
        </header>

        <main className="relative pt-32 sm:pt-40 pb-12 px-4 min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full glass-card p-8 rounded-2xl text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mx-auto"
            >
              <Swords className="w-8 h-8 text-primary" />
            </motion.div>
            
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold">You've Been Challenged! 🎯</h1>
              <p className="text-muted-foreground">
                {challengerProfile?.display_name || "Someone"} wants to battle you in a live MCQ duel
              </p>
              {chapterInfo && (
                <p className="text-sm text-muted-foreground">
                  Topic: <span className="text-foreground font-medium">{chapterInfo.name}</span>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full neon-glow" 
                asChild
              >
                <Link to={`/login?redirect=/challenge/${challengeId}`}>
                  <Zap className="w-4 h-4 mr-2" />
                  Sign In to Accept
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Create a free account in seconds to join the battle!
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Get display names
  const challengerName = challengerProfile?.display_name || "Challenger";
  // Important: opponent might not have a readable/created profile row, so we must not
  // use profile presence as the "has joined" signal.
  const opponentName = challenge?.opponent_id
    ? opponentProfile?.display_name || "Opponent"
    : null;
  const myName = isChallenger ? challengerName : (opponentName || "You");
  const theirName = isChallenger ? (opponentName || "Opponent") : challengerName;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 gradient-mesh-animated" />
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      
      {/* Floating orbs */}
      <div className="orb orb-cyan w-[500px] h-[500px] -top-64 -left-64 opacity-60" />
      <div className="orb orb-green w-[400px] h-[400px] -bottom-48 -right-48 opacity-50" style={{ animationDelay: '7s' }} />
      <div className="orb orb-purple w-[300px] h-[300px] top-1/3 right-1/4 opacity-40" style={{ animationDelay: '14s' }} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass-strong border-b border-border/30">
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
                    <span className="text-sm font-medium">Live 1v1 Duel</span>
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
                    Real-time MCQ battle with friends!
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
                          Create Live Challenge
                        </h3>
                        <p className="text-muted-foreground">
                          Same questions • Same time • Real competition
                        </p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all duration-300" />
                    </div>
                  </motion.button>
                </motion.div>

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
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4"
                  >
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Step 1 of 2</span>
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-3xl sm:text-4xl font-bold mb-2"
                  >
                    Choose Your <span className="text-gradient">Arena</span>
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-muted-foreground text-sm sm:text-base"
                  >
                    Pick a subject to battle in
                  </motion.p>
                </div>

                <div className="space-y-2">
                  {subjects.map((subject, index) => (
                    <motion.button
                      key={subject.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.025, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setStep("chapter");
                      }}
                      className="w-full group relative overflow-hidden"
                    >
                      {/* Animated gradient background on hover */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-accent/0 group-hover:from-primary/15 group-hover:via-primary/10 group-hover:to-accent/10 transition-all duration-500" />
                      
                      <div className="relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/50 group-hover:border-primary/40 bg-card/40 backdrop-blur-sm transition-all duration-300 group-hover:shadow-[0_0_25px_hsl(var(--primary)/0.15)]">
                        {/* Icon with glow effect */}
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 rounded-xl bg-primary/40 blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500" />
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-secondary via-secondary/80 to-secondary/50 border border-border/50 group-hover:border-primary/30 flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
                            <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300">{subject.icon}</span>
                          </div>
                        </div>
                        
                        {/* Subject name */}
                        <div className="flex-1 text-left">
                          <span className="block text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                            {subject.name}
                          </span>
                          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Tap to select
                          </span>
                        </div>
                        
                        {/* Arrow with pulse animation on hover */}
                        <div className="flex-shrink-0 relative">
                          <div className="absolute inset-0 rounded-lg bg-primary/30 blur-md opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-300" />
                          <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary/50 group-hover:bg-primary/20 flex items-center justify-center transition-all duration-300">
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                          </div>
                        </div>
                      </div>
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
                    <div className="text-center">
                      <p className="text-foreground font-medium">Setting up your battle arena...</p>
                      <p className="text-muted-foreground text-sm mt-1">Loading questions</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {chapters.map((chapter, index) => (
                      <motion.button
                        key={chapter.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleCreateChallenge(chapter)}
                        className="w-full group relative overflow-hidden"
                      >
                        {/* Background with gradient border effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/20 group-hover:via-primary/10 group-hover:to-primary/5 transition-all duration-500" />
                        
                        <div className="relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/50 group-hover:border-primary/40 bg-card/30 backdrop-blur-sm transition-all duration-300 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
                          {/* Number badge with glow */}
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 rounded-lg bg-primary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <span className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/50 border border-border/50 group-hover:border-primary/50 flex items-center justify-center text-xs sm:text-sm font-bold text-muted-foreground group-hover:text-primary transition-all duration-300">
                              {index + 1}
                            </span>
                          </div>
                          
                          {/* Chapter name */}
                          <span className="flex-1 text-left text-sm sm:text-base font-medium text-foreground/90 group-hover:text-foreground transition-colors duration-300 line-clamp-2">
                            {chapter.name}
                          </span>
                          
                          {/* Arrow with animation */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary/50 group-hover:bg-primary/20 flex items-center justify-center transition-all duration-300">
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Lobby */}
            {step === "lobby" && challenge && (
              <ChallengeLobby
                challengeId={challenge.id}
                isChallenger={isChallenger}
                challengerReady={challenge.challenger_ready}
                opponentReady={challenge.opponent_ready}
                challengerName={challengerName}
                opponentName={opponentName}
                chapterInfo={chapterInfo}
                questionCount={questions.length}
                onReady={handleReady}
                onLeaveDuel={handleLeaveDuel}
                isSettingReady={isSettingReady}
                isLeaving={isLeaving}
                connectionStatus={connectionStatus}
                isStarting={isStartingGame}
              />
            )}

            {/* Play */}
            {step === "play" && questions.length > 0 && challenge?.started_at && (
              <ChallengePlay
                questions={questions}
                startedAt={challenge.started_at}
                opponentProgress={opponentProgress}
                onAnswerSubmit={handleAnswerSubmit}
                onQuestionValidated={handleQuestionValidated}
                onFinish={handleFinish}
                validateAnswer={validateAnswer}
              />
            )}

            {/* Waiting */}
            {step === "waiting" && (
              <ChallengeWait
                score={myScore}
                totalQuestions={questions.length}
                opponentProgress={opponentProgress}
              />
            )}

            {/* Result */}
            {step === "result" && challenge && (
              <ChallengeResult
                isChallenger={isChallenger}
                myScore={isChallenger ? challenge.challenger_score : challenge.opponent_score}
                theirScore={isChallenger ? challenge.opponent_score : challenge.challenger_score}
                myTimeMs={isChallenger ? challenge.challenger_time_ms : challenge.opponent_time_ms}
                theirTimeMs={isChallenger ? challenge.opponent_time_ms : challenge.challenger_time_ms}
                myName={myName}
                theirName={theirName}
                chapterInfo={chapterInfo}
                isComplete={challenge.status === "finished" || (challenge.challenger_score !== null && challenge.opponent_score !== null)}
                showGuestNudge={!user}
              />
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
          const isComplete = c.status === "finished" || c.status === "closed";
          const isWaiting = !c.opponent_id && isChallenger;
          const inLobby = c.status === "lobby";
          const isPlaying = c.status === "playing";

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
                    : inLobby
                    ? "In lobby - get ready!"
                    : isPlaying
                    ? "Battle in progress!"
                    : isComplete
                    ? `${myScore} - ${theirScore}`
                    : "Pending..."}
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
              {(inLobby || isPlaying) && (
                <Button variant="neon" size="sm">Continue</Button>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
