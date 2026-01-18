import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  Zap,
  Flame,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { RichText } from "@/components/RichText";
import { ShareScoreButton } from "@/components/ShareScoreButton";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  source: string;
  correct_answer?: number;
  explanation?: string | null;
};

interface PracticeResultProps {
  score: number;
  totalQuestions: number;
  accuracy: number;
  questions: Question[];
  answers: (number | null)[];
  selectedSubject: { name: string; icon: string } | null;
  selectedChapter: { name: string } | null;
  user: { id: string } | null;
  isGenerating: boolean;
  onRetryChapter: () => void;
  onNewChapter: () => void;
}

export function PracticeResult({
  score,
  totalQuestions,
  accuracy,
  questions,
  answers,
  selectedSubject,
  selectedChapter,
  user,
  isGenerating,
  onRetryChapter,
  onNewChapter,
}: PracticeResultProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const incorrectCount = totalQuestions - score;

  // Get result feedback based on accuracy
  const getResultFeedback = () => {
    if (accuracy >= 80) return { emoji: "🔥", message: "Exceptional performance! You're mastering this topic.", badge: "MCQ Boss!" };
    if (accuracy >= 60) return { emoji: "⚡", message: "Good attempt. Accuracy improves with consistency.", badge: null };
    if (accuracy >= 40) return { emoji: "💪", message: "Keep practicing. You're building strong foundations.", badge: null };
    return { emoji: "🎯", message: "Every attempt counts. Focus on weak areas below.", badge: null };
  };

  const feedback = getResultFeedback();

  // Get options for a question
  const getOptions = (q: Question) => [q.option_a, q.option_b, q.option_c, q.option_d];
  const getCorrectIndex = (q: Question) => {
    if (q.correct_answer === undefined || q.correct_answer === null) return null;
    const raw = Number(q.correct_answer);
    if (!Number.isFinite(raw)) return null;
    if (raw >= 0 && raw <= 3) return raw;
    return null;
  };

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* ===================== HERO RESULT SECTION ===================== */}
      <section
        className="relative glass rounded-3xl p-8 sm:p-10 text-center overflow-hidden"
        style={{ boxShadow: "0 0 60px hsl(var(--neon-cyan) / 0.12)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />

        {/* Emoji */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
          className="relative text-7xl sm:text-8xl mb-3"
        >
          {feedback.emoji}
        </motion.div>

        {/* Badge (if earned) */}
        {feedback.badge && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-semibold mb-4"
          >
            <TrendingUp className="w-4 h-4" />
            {feedback.badge}
          </motion.div>
        )}

        {/* Main Score Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          {/* Circular Progress Ring */}
          <div className="relative w-36 h-36 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--secondary))"
                strokeWidth="8"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={264}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 - (264 * accuracy) / 100 }}
                transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  filter: accuracy >= 70 ? "drop-shadow(0 0 8px hsl(var(--primary)))" : undefined,
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-3xl font-bold">{accuracy}%</span>
            </div>
          </div>

          {/* Score Fraction */}
          <h1 className="font-display text-5xl sm:text-6xl font-bold neon-text mb-2">
            {score} / {totalQuestions}
          </h1>
          <p className="text-muted-foreground text-lg">{feedback.message}</p>
        </motion.div>
      </section>

      {/* ===================== PERFORMANCE SNAPSHOT ===================== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-3 gap-3"
      >
        {/* Correct */}
        <div className="glass rounded-2xl p-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-2">
            <Check className="w-5 h-5 text-accent" />
          </div>
          <p className="font-display text-2xl font-bold text-accent">{score}</p>
          <p className="text-xs text-muted-foreground">Correct</p>
        </div>

        {/* Incorrect */}
        <div className="glass rounded-2xl p-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-destructive/20 flex items-center justify-center mb-2">
            <X className="w-5 h-5 text-destructive" />
          </div>
          <p className="font-display text-2xl font-bold text-destructive">{incorrectCount}</p>
          <p className="text-xs text-muted-foreground">Incorrect</p>
        </div>

        {/* Avg Time (placeholder - will be enhanced when time tracking is added) */}
        <div className="glass rounded-2xl p-4 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-primary">—</p>
          <p className="text-xs text-muted-foreground">Avg Time</p>
        </div>
      </motion.section>

      {/* ===================== QUESTION DISTRIBUTION BAR ===================== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-4"
      >
        <p className="text-xs text-muted-foreground mb-3">Question Distribution</p>
        <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
          <motion.div
            className="bg-accent h-full"
            initial={{ width: 0 }}
            animate={{ width: `${(score / totalQuestions) * 100}%` }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="bg-destructive h-full"
            initial={{ width: 0 }}
            animate={{ width: `${(incorrectCount / totalQuestions) * 100}%` }}
            transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Correct: {score}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            Incorrect: {incorrectCount}
          </span>
        </div>
      </motion.section>

      {/* ===================== INSIGHT SECTION ===================== */}
      {incorrectCount > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Target className="w-4 h-4" />
            What You Can Improve
          </h3>

          <div className="glass rounded-2xl p-4 border-l-4 border-primary">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{selectedChapter?.name || "This chapter"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You answered {incorrectCount} out of {totalQuestions} incorrectly.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 mt-2 text-primary"
                  onClick={onRetryChapter}
                  disabled={isGenerating}
                >
                  Practice Again →
                </Button>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ===================== ANSWER REVIEW SECTION ===================== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setReviewOpen(!reviewOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium text-sm">Review Questions</span>
          <motion.div
            animate={{ rotate: reviewOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {reviewOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-border/50"
            >
              <div className="max-h-80 overflow-y-auto">
                {questions.map((q, idx) => {
                  const userAnswer = answers[idx];
                  const correctIdx = getCorrectIndex(q);
                  const isCorrect = userAnswer !== null && correctIdx !== null && userAnswer === correctIdx;
                  const isExpanded = expandedQuestion === idx;
                  const options = getOptions(q);

                  return (
                    <div key={q.id} className="border-b border-border/30 last:border-b-0">
                      {/* Question Row */}
                      <button
                        onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
                      >
                        <span className="text-xs text-muted-foreground w-6">Q{idx + 1}</span>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                            isCorrect ? "bg-accent/20" : "bg-destructive/20"
                          )}
                        >
                          {isCorrect ? (
                            <Check className="w-3.5 h-3.5 text-accent" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-destructive" />
                          )}
                        </div>
                        <span className="flex-1 text-sm truncate">{q.text.slice(0, 60)}...</span>
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>

                      {/* Expanded Question Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 space-y-3">
                              {/* Full Question */}
                              <div className="bg-secondary/30 rounded-lg p-3">
                                <RichText as="p" className="text-sm" text={q.text} />
                              </div>

                              {/* Options */}
                              <div className="space-y-2">
                                {options.map((opt, optIdx) => {
                                  const letter = String.fromCharCode(65 + optIdx);
                                  const isUserChoice = userAnswer === optIdx;
                                  const isCorrectOption = correctIdx === optIdx;

                                  return (
                                    <div
                                      key={optIdx}
                                      className={cn(
                                        "flex items-start gap-2 p-2 rounded-lg text-sm",
                                        isCorrectOption && "bg-accent/10 border border-accent/30",
                                        isUserChoice && !isCorrectOption && "bg-destructive/10 border border-destructive/30",
                                        !isCorrectOption && !isUserChoice && "bg-secondary/20"
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "w-5 h-5 rounded text-xs flex items-center justify-center font-medium shrink-0",
                                          isCorrectOption && "bg-accent text-accent-foreground",
                                          isUserChoice && !isCorrectOption && "bg-destructive text-destructive-foreground",
                                          !isCorrectOption && !isUserChoice && "bg-secondary text-muted-foreground"
                                        )}
                                      >
                                        {isCorrectOption ? <Check className="w-3 h-3" /> : letter}
                                      </span>
                                      <RichText as="span" className="flex-1 text-xs" text={opt} />
                                      {isUserChoice && !isCorrectOption && (
                                        <span className="text-xs text-destructive">Your answer</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation */}
                              {q.explanation && (
                                <div className="text-xs text-muted-foreground bg-secondary/20 rounded-lg p-3">
                                  <RichText as="span" text={q.explanation} />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ===================== NEXT ACTION ZONE ===================== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="space-y-3"
      >
        {/* Primary CTA */}
        <Button
          variant="neon"
          size="lg"
          onClick={onRetryChapter}
          disabled={isGenerating}
          className="w-full h-14 text-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RotateCcw className="w-5 h-5 mr-2" />
              Practice Again
            </>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">Improve your accuracy</p>

        {/* Secondary CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="neon-outline" onClick={onNewChapter} className="h-12">
            <BookOpen className="w-4 h-4 mr-2" />
            New Chapter
          </Button>
          <Button variant="ghost" className="h-12" asChild>
            <Link to="/dashboard">
              <Target className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </motion.section>

      {/* ===================== SHARE (SUBTLE) ===================== */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center gap-3"
      >
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" asChild>
          <Link to="/challenge/new">
            <Users className="w-4 h-4" />
            Challenge Friend
          </Link>
        </Button>
        <ShareScoreButton
          score={score}
          totalQuestions={totalQuestions}
          accuracy={accuracy}
          subjectName={selectedSubject?.name || ""}
          chapterName={selectedChapter?.name || ""}
        />
      </motion.section>

      {/* ===================== SIGN IN CTA (GUESTS ONLY) ===================== */}
      {!user && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="glass rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Save your progress!</p>
              <p className="text-xs text-muted-foreground">Sign in to track streaks & compete</p>
            </div>
          </div>
          <Button variant="neon" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
        </motion.section>
      )}
    </motion.div>
  );
}
