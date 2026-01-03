import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Check, X, AlertCircle, Zap, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

// Mock data - this will come from Supabase
const subjects = [
  { id: "physics", name: "Physics", icon: "⚡" },
  { id: "chemistry", name: "Chemistry", icon: "🧪" },
  { id: "maths", name: "Mathematics", icon: "📐" },
  { id: "biology", name: "Biology", icon: "🧬" },
];

const chapters: Record<string, { id: string; name: string }[]> = {
  physics: [
    { id: "electrostatics", name: "Electrostatics" },
    { id: "current", name: "Current Electricity" },
    { id: "magnetism", name: "Magnetism" },
    { id: "optics", name: "Optics" },
    { id: "modern", name: "Modern Physics" },
  ],
  chemistry: [
    { id: "solid-state", name: "Solid State" },
    { id: "solutions", name: "Solutions" },
    { id: "electrochemistry", name: "Electrochemistry" },
    { id: "kinetics", name: "Chemical Kinetics" },
  ],
  maths: [
    { id: "relations", name: "Relations & Functions" },
    { id: "matrices", name: "Matrices" },
    { id: "calculus", name: "Calculus" },
    { id: "vectors", name: "Vectors" },
  ],
  biology: [
    { id: "reproduction", name: "Reproduction" },
    { id: "genetics", name: "Genetics" },
    { id: "evolution", name: "Evolution" },
    { id: "ecology", name: "Ecology" },
  ],
};

// Mock MCQs
const mockQuestions = [
  {
    id: 1,
    text: "A parallel plate capacitor with air between the plates has capacitance of 8 pF. What is the capacitance if the distance between the plates is reduced by half?",
    options: ["4 pF", "8 pF", "16 pF", "32 pF"],
    correct: 2,
    explanation: "Capacitance C = ε₀A/d. When d is halved, C doubles. So C' = 2 × 8 = 16 pF",
    source: "verified" as const,
  },
  {
    id: 2,
    text: "The electric field inside a conductor is always:",
    options: ["Maximum", "Minimum but not zero", "Zero", "Infinity"],
    correct: 2,
    explanation: "Inside a conductor, free electrons redistribute to cancel any internal field, making E = 0.",
    source: "verified" as const,
  },
  {
    id: 3,
    text: "Two charges +q and -q are placed at a distance d apart. The electric potential at the midpoint is:",
    options: ["kq/d", "2kq/d", "Zero", "4kq/d"],
    correct: 2,
    explanation: "At the midpoint, distances from both charges are equal (d/2). Potentials are +2kq/d and -2kq/d, which sum to zero.",
    source: "ai" as const,
  },
  {
    id: 4,
    text: "The SI unit of electric permittivity is:",
    options: ["C²N⁻¹m⁻²", "Nm²C⁻²", "NC⁻¹m⁻¹", "Fm⁻¹"],
    correct: 0,
    explanation: "From Coulomb's law, ε₀ has units of C²N⁻¹m⁻². Also equivalent to F/m.",
    source: "verified" as const,
  },
  {
    id: 5,
    text: "If the potential in a region is given by V = 6x - 8xy - 8y + 6yz, the electric field at (1, 1, 1) is:",
    options: ["2î + 2ĵ - 6k̂", "2î - 2ĵ + 6k̂", "6î + 2ĵ + 2k̂", "-2î + 2ĵ + 6k̂"],
    correct: 0,
    explanation: "E = -∇V = -(∂V/∂x)î - (∂V/∂y)ĵ - (∂V/∂z)k̂. Calculating partial derivatives and substituting (1,1,1).",
    source: "ai" as const,
  },
];

type Step = "subject" | "chapter" | "practice" | "result";

export default function Practice() {
  const [step, setStep] = useState<Step>("subject");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const question = mockQuestions[currentQ];
  const isCorrect = selectedAnswer === question?.correct;
  const score = answers.filter((a, i) => a === mockQuestions[i]?.correct).length;
  const totalQuestions = mockQuestions.length;

  const handleSubjectSelect = (id: string) => {
    setSelectedSubject(id);
    setStep("chapter");
  };

  const handleChapterSelect = (id: string) => {
    setSelectedChapter(id);
    setStep("practice");
    setCurrentQ(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    setShowResult(true);
    setAnswers([...answers, selectedAnswer]);
  };

  const handleNext = () => {
    if (currentQ < totalQuestions - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setStep("result");
    }
  };

  const handleRestart = () => {
    setStep("subject");
    setSelectedSubject(null);
    setSelectedChapter(null);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const goBack = () => {
    if (step === "chapter") {
      setStep("subject");
      setSelectedSubject(null);
    } else if (step === "practice") {
      setStep("chapter");
      setSelectedChapter(null);
    }
  };

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {(step === "chapter" || step === "practice") && (
              <button onClick={goBack} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">MCQX</span>
            </Link>
          </div>

          {step === "practice" && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Q {currentQ + 1}/{totalQuestions}
              </span>
              <span className="text-sm font-semibold neon-text-green">
                {score}/{currentQ + (showResult ? 1 : 0)}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="pt-24 pb-12 px-4">
        <div className="container max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Subject Selection */}
            {step === "subject" && (
              <motion.div
                key="subject"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="font-display text-3xl font-bold mb-2">Pick a Subject</h1>
                  <p className="text-muted-foreground">Choose what you want to practice</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {subjects.map((subject) => (
                    <motion.button
                      key={subject.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSubjectSelect(subject.id)}
                      className="glass rounded-2xl p-6 text-left transition-all hover:border-primary/50 hover:shadow-[0_0_30px_hsl(var(--neon-cyan)/0.15)] group"
                    >
                      <span className="text-4xl mb-4 block">{subject.icon}</span>
                      <h3 className="font-display text-lg font-semibold group-hover:text-primary transition-colors">
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h1 className="font-display text-3xl font-bold mb-2">
                    {subjects.find((s) => s.id === selectedSubject)?.icon}{" "}
                    {subjects.find((s) => s.id === selectedSubject)?.name}
                  </h1>
                  <p className="text-muted-foreground">Select a chapter to practice</p>
                </div>

                <div className="space-y-3">
                  {chapters[selectedSubject]?.map((chapter) => (
                    <motion.button
                      key={chapter.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleChapterSelect(chapter.id)}
                      className="w-full glass rounded-xl p-5 text-left transition-all hover:border-primary/50 flex items-center justify-between group"
                    >
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {chapter.name}
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Practice Mode */}
            {step === "practice" && question && (
              <motion.div
                key={`question-${currentQ}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Progress value={((currentQ + 1) / totalQuestions) * 100} className="h-2" />

                {/* Question Card */}
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="text-sm text-muted-foreground">Question {currentQ + 1}</span>
                    {question.source === "ai" && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
                        <AlertCircle className="w-3 h-3" />
                        AI-generated
                      </span>
                    )}
                  </div>
                  <p className="text-lg leading-relaxed">{question.text}</p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {question.options.map((option, index) => {
                    const letter = String.fromCharCode(65 + index);
                    let optionClass = "glass rounded-xl p-4 text-left transition-all cursor-pointer flex items-center gap-4";
                    
                    if (showResult) {
                      if (index === question.correct) {
                        optionClass += " border-accent bg-accent/10";
                      } else if (index === selectedAnswer && index !== question.correct) {
                        optionClass += " border-destructive bg-destructive/10";
                      }
                    } else if (selectedAnswer === index) {
                      optionClass += " border-primary bg-primary/10";
                    } else {
                      optionClass += " hover:border-primary/50";
                    }

                    return (
                      <motion.button
                        key={index}
                        whileHover={!showResult ? { scale: 1.01 } : {}}
                        whileTap={!showResult ? { scale: 0.99 } : {}}
                        onClick={() => handleAnswerSelect(index)}
                        className={optionClass}
                        disabled={showResult}
                      >
                        <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-semibold shrink-0">
                          {letter}
                        </span>
                        <span className="flex-1">{option}</span>
                        {showResult && index === question.correct && (
                          <Check className="w-5 h-5 text-accent shrink-0" />
                        )}
                        {showResult && index === selectedAnswer && index !== question.correct && (
                          <X className="w-5 h-5 text-destructive shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`rounded-xl p-5 ${isCorrect ? "bg-accent/10 border border-accent/30" : "bg-destructive/10 border border-destructive/30"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {isCorrect ? (
                            <Check className="w-5 h-5 text-accent" />
                          ) : (
                            <X className="w-5 h-5 text-destructive" />
                          )}
                          <span className={`font-semibold ${isCorrect ? "text-accent" : "text-destructive"}`}>
                            {isCorrect ? "Correct!" : "Incorrect"}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{question.explanation}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {!showResult ? (
                    <Button
                      variant="neon"
                      size="lg"
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={selectedAnswer === null}
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button variant="neon" size="lg" className="flex-1" onClick={handleNext}>
                      {currentQ < totalQuestions - 1 ? "Next Question" : "See Results"}
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Flag className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Results */}
            {step === "result" && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="glass rounded-3xl p-10">
                  <div className="text-6xl mb-4">
                    {score >= totalQuestions * 0.8 ? "🔥" : score >= totalQuestions * 0.5 ? "👍" : "💪"}
                  </div>
                  <h1 className="font-display text-4xl font-bold mb-2">
                    {score}/{totalQuestions}
                  </h1>
                  <p className="text-muted-foreground mb-6">
                    {score >= totalQuestions * 0.8
                      ? "MCQ Boss! You crushed it!"
                      : score >= totalQuestions * 0.5
                      ? "Good job! Keep practicing!"
                      : "Keep going! Practice makes perfect!"}
                  </p>

                  <div className="flex items-center justify-center gap-8 mb-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">{answers.filter((a, i) => mockQuestions[i]?.source === "verified" && a === mockQuestions[i]?.correct).length}</div>
                      <div className="text-xs text-muted-foreground">Verified ✓</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{answers.filter((a, i) => mockQuestions[i]?.source === "ai" && a === mockQuestions[i]?.correct).length}</div>
                      <div className="text-xs text-muted-foreground">AI-gen 🤖</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button variant="neon" size="lg" onClick={handleRestart}>
                      Practice Again
                    </Button>
                    <Button variant="neon-outline" size="lg" asChild>
                      <Link to="/">Back to Home</Link>
                    </Button>
                  </div>
                </div>

                <div className="glass rounded-xl p-4 text-left">
                  <p className="text-sm text-muted-foreground mb-2">
                    💡 Sign in to save your progress and track streaks!
                  </p>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Sign In →</Link>
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
