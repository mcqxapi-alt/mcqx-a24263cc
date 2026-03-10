import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, Loader2, ChevronRight, Target, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/RichText";
import type { QuestionPublic } from "@/hooks/useSecureQuestions";

type Question = QuestionPublic & {
  correct_answer?: number;
  explanation?: string | null;
};

type Answer = {
  question_index: number;
  selected_answer: number;
  time_taken_ms: number;
  is_correct: boolean;
};

type ChallengePlayProps = {
  questions: Question[];
  startedAt: string;
  opponentProgress: number;
  onAnswerSubmit: (questionIndex: number, selectedAnswer: number, timeTakenMs: number, isCorrect: boolean) => void;
  onQuestionValidated: (questionIndex: number, correctAnswer: number, explanation: string | null) => void;
  onFinish: (score: number, totalTimeMs: number, answers: Answer[]) => void;
  validateAnswer: (questionId: string, selectedAnswer: number) => Promise<{
    correct_answer: number;
    is_correct: boolean;
    explanation: string | null;
  }>;
};

export function ChallengePlay({
  questions,
  startedAt,
  opponentProgress,
  onAnswerSubmit,
  onQuestionValidated,
  onFinish,
  validateAnswer,
}: ChallengePlayProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const questionStartTimeRef = useRef<number>(Date.now());
  const gameStartTimeRef = useRef<number>(new Date(startedAt).getTime());

  const question = questions[currentQ];
  const correctIndex = question?.correct_answer;
  const score = answers.filter(a => a.is_correct).length;

  // Reset question start time when moving to new question
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentQ]);

  const getOptions = (q: Question) => [q.option_a, q.option_b, q.option_c, q.option_d];

  const handleAnswerSelect = (index: number) => {
    if (showResult || isValidating) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || !question) return;
    setIsValidating(true);

    const timeTakenMs = Date.now() - questionStartTimeRef.current;

    try {
      const result = await validateAnswer(question.id, selectedAnswer);
      
      // Update question with correct answer
      onQuestionValidated(currentQ, result.correct_answer, result.explanation);

      const newAnswer: Answer = {
        question_index: currentQ,
        selected_answer: selectedAnswer,
        time_taken_ms: timeTakenMs,
        is_correct: result.is_correct,
      };

      setAnswers(prev => [...prev, newAnswer]);
      onAnswerSubmit(currentQ, selectedAnswer, timeTakenMs, result.is_correct);
      setShowResult(true);
    } catch (err) {
      console.error("Error validating answer:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Calculate final stats
      const totalTimeMs = Date.now() - gameStartTimeRef.current;
      const finalScore = answers.filter(a => a.is_correct).length;
      onFinish(finalScore, totalTimeMs, answers);
    }
  };

  if (!question) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 gpu-accelerated contain-layout"
    >
      {/* Progress bar with opponent indicator - Compact */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Q</span>
            <span className="font-semibold">{currentQ + 1}</span>
            <span className="text-muted-foreground">/{questions.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-accent">{score}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="w-3 h-3" />
              <span className="text-xs">{opponentProgress}/{questions.length}</span>
            </div>
          </div>
        </div>
        
        <div className="relative h-2 rounded-full bg-secondary/50 overflow-hidden backdrop-blur-sm">
          {/* Your progress */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent progress-glow rounded-full z-10"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQ + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Opponent progress indicator */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50 rounded-full"
            initial={{ left: 0 }}
            animate={{ left: `${(opponentProgress / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question - Mobile optimized with smooth overlapping transitions */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentQ}
          layout
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15, position: "absolute" }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="glass-card rounded-2xl p-4 sm:p-6 gpu-accelerated contain-layout"
        >
          <div className="flex items-start gap-3 mb-5">
            <span className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {currentQ + 1}
            </span>
            <RichText as="p" className="text-base sm:text-lg leading-relaxed pt-1" text={question.text} />
          </div>

          <div className="space-y-2">
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.03, 
                    duration: 0.2,
                    ease: [0.32, 0.72, 0, 1]
                  }}
                  whileTap={!showResult ? { scale: 0.98 } : {}}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`w-full p-3.5 sm:p-4 rounded-xl text-left flex items-center gap-3 gpu-accelerated touch-manipulation contain-layout ${
                    variant === "correct"
                      ? "bg-green-500/20 border-2 border-green-500 shadow-[0_0_20px_hsl(var(--neon-green)/0.3)]"
                      : variant === "wrong"
                      ? "bg-red-500/20 border-2 border-red-500 shadow-[0_0_20px_hsl(0_84%_60%/0.3)]"
                      : isSelected
                      ? "glass-card border-2 border-primary shadow-[0_0_15px_hsl(var(--primary)/0.15)]"
                      : "glass-card border border-transparent hover:border-primary/20"
                  }`}
                  style={{ 
                    transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  <span 
                    className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-sm font-bold gpu-accelerated ${
                      variant === "correct"
                        ? "bg-green-500 text-white"
                        : variant === "wrong"
                        ? "bg-red-500 text-white"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary"
                    }`}
                    style={{ transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease' }}
                  >
                    {variant === "correct" ? <Check className="w-4 h-4" /> : 
                     variant === "wrong" ? <X className="w-4 h-4" /> : 
                     String.fromCharCode(65 + index)}
                  </span>
                  <RichText as="span" className="text-sm sm:text-base" text={option} />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Explanation - Compact */}
      {showResult && question.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="glass-card rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm">Explanation</span>
          </div>
          <RichText as="p" className="text-muted-foreground text-sm leading-relaxed" text={question.explanation} />
        </motion.div>
      )}

      {/* Actions - Full width on mobile with smooth state transitions */}
      <div className="pt-2 gpu-accelerated">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="neon"
                size="lg"
                className="w-full h-12 text-base touch-manipulation"
                disabled={selectedAnswer === null || isValidating}
                onClick={handleSubmit}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Lock Answer"
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="next"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="neon"
                size="lg"
                className="w-full h-12 text-base group touch-manipulation"
                onClick={handleNext}
              >
                {currentQ < questions.length - 1 ? "Next Question" : "Finish"}
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
