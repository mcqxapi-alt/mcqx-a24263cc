import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
    if (showResult) return;
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
      className="space-y-6"
    >
      {/* Progress bar with opponent indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Q</span>
            <span className="font-semibold">{currentQ + 1}</span>
            <span className="text-muted-foreground">/{questions.length}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4 text-accent" />
              <span className="font-bold text-accent">{score}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <User className="w-3 h-3" />
              <span>Opponent: {opponentProgress}/{questions.length}</span>
            </div>
          </div>
        </div>
        
        <div className="relative h-3 rounded-full bg-secondary/50 overflow-hidden backdrop-blur-sm">
          {/* Your progress */}
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent progress-glow rounded-full z-10"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQ + (showResult ? 1 : 0)) / questions.length) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Opponent progress indicator */}
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-muted-foreground/50 rounded-full"
            initial={{ left: 0 }}
            animate={{ left: `${(opponentProgress / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
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
          <RichText as="p" className="text-xl leading-relaxed pt-2" text={question.text} />
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
                    : "bg-secondary"
                }`}>
                  {variant === "correct" ? <Check className="w-5 h-5" /> : 
                   variant === "wrong" ? <X className="w-5 h-5" /> : 
                   String.fromCharCode(65 + index)}
                </span>
                <RichText as="span" className="text-lg" text={option} />
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
          <RichText as="p" className="text-muted-foreground leading-relaxed" text={question.explanation} />
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
              "Lock Answer"
            )}
          </Button>
        ) : (
          <Button
            variant="neon"
            size="lg"
            className="flex-1 h-14 text-lg group"
            onClick={handleNext}
          >
            {currentQ < questions.length - 1 ? "Next Question" : "Finish"}
            <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}
