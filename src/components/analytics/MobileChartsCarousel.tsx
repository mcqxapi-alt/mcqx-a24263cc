import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AccuracyRadialChart } from "./AccuracyRadialChart";
import { TrendChart } from "./TrendChart";
import { SubjectBreakdown } from "./SubjectBreakdown";

interface ChapterStats {
  chapter_id: string;
  chapter_name: string;
  subject_name: string;
  subject_icon: string;
  total_attempts: number;
  correct_answers: number;
  accuracy: number;
  trend: "improving" | "declining" | "stable" | "new";
}

interface MobileChartsCarouselProps {
  accuracy: number;
  correct: number;
  incorrect: number;
  chapters: ChapterStats[];
  selectedSubject: string | null;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

export function MobileChartsCarousel({
  accuracy,
  correct,
  incorrect,
  chapters,
  selectedSubject,
}: MobileChartsCarouselProps) {
  const [[activeIndex, direction], setActiveIndex] = useState([0, 0]);

  const charts = [
    {
      id: "accuracy",
      title: "Accuracy",
      subtitle: "Correct vs Incorrect",
      component: (
        <AccuracyRadialChart
          accuracy={accuracy}
          correct={correct}
          incorrect={incorrect}
        />
      ),
    },
    {
      id: "trends",
      title: "Trends",
      subtitle: "Weekly Progress",
      component: <TrendChart chapters={chapters} />,
    },
    {
      id: "subjects",
      title: "Subjects",
      subtitle: "Performance Breakdown",
      component: (
        <SubjectBreakdown chapters={chapters} selectedSubject={selectedSubject} />
      ),
    },
  ];

  const paginate = (newDirection: number) => {
    const newIndex = activeIndex + newDirection;
    if (newIndex >= 0 && newIndex < charts.length) {
      setActiveIndex([newIndex, newDirection]);
    }
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const swipeThreshold = 50;
    const swipeVelocity = 500;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -swipeVelocity) {
      if (activeIndex < charts.length - 1) {
        paginate(1);
      }
    } else if (info.offset.x > swipeThreshold || info.velocity.x > swipeVelocity) {
      if (activeIndex > 0) {
        paginate(-1);
      }
    }
  };

  return (
    <div className="relative">
      {/* Navigation Dots */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {charts.map((chart, index) => (
          <button
            key={chart.id}
            onClick={() => setActiveIndex([index, index > activeIndex ? 1 : -1])}
            className={`transition-all duration-300 ${
              index === activeIndex
                ? "w-8 h-2 rounded-full bg-primary"
                : "w-2 h-2 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to ${chart.title}`}
          />
        ))}
      </div>

      {/* Chart Title */}
      <div className="text-center mb-3">
        <motion.h3
          key={charts[activeIndex].title}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display font-bold text-lg"
        >
          {charts[activeIndex].title}
        </motion.h3>
        <motion.p
          key={charts[activeIndex].subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-muted-foreground"
        >
          {charts[activeIndex].subtitle}
        </motion.p>
      </div>

      {/* Carousel Container */}
      <div className="relative overflow-hidden">
        {/* Side Navigation Arrows */}
        <button
          onClick={() => paginate(-1)}
          disabled={activeIndex === 0}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full glass border border-white/10 transition-all ${
            activeIndex === 0
              ? "opacity-30 cursor-not-allowed"
              : "opacity-100 hover:bg-white/10"
          }`}
          aria-label="Previous chart"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => paginate(1)}
          disabled={activeIndex === charts.length - 1}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full glass border border-white/10 transition-all ${
            activeIndex === charts.length - 1
              ? "opacity-30 cursor-not-allowed"
              : "opacity-100 hover:bg-white/10"
          }`}
          aria-label="Next chart"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Swipeable Content */}
        <div className="px-8">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="cursor-grab active:cursor-grabbing"
            >
              {charts[activeIndex].component}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Swipe Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-muted-foreground mt-4"
      >
        ← Swipe to explore →
      </motion.p>
    </div>
  );
}
