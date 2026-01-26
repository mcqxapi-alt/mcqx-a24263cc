import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Atom, 
  FlaskConical, 
  Calculator, 
  Leaf, 
  Globe, 
  BookOpen,
  ChevronRight,
  ChevronLeft 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Subject {
  id: string;
  name: string;
  icon: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  atom: Atom,
  "flask-conical": FlaskConical,
  calculator: Calculator,
  leaf: Leaf,
  globe: Globe,
  "book-open": BookOpen,
};

const colorVariants = [
  "from-cyan-500/20 to-cyan-500/5 hover:from-cyan-500/30 hover:to-cyan-500/10 border-cyan-500/30",
  "from-green-500/20 to-green-500/5 hover:from-green-500/30 hover:to-green-500/10 border-green-500/30",
  "from-pink-500/20 to-pink-500/5 hover:from-pink-500/30 hover:to-pink-500/10 border-pink-500/30",
  "from-purple-500/20 to-purple-500/5 hover:from-purple-500/30 hover:to-purple-500/10 border-purple-500/30",
  "from-orange-500/20 to-orange-500/5 hover:from-orange-500/30 hover:to-orange-500/10 border-orange-500/30",
  "from-blue-500/20 to-blue-500/5 hover:from-blue-500/30 hover:to-blue-500/10 border-blue-500/30",
];

export function SubjectCarousel() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSubjects() {
      const { data } = await supabase
        .from("subjects")
        .select("id, name, icon")
        .order("display_order");
      
      if (data) setSubjects(data);
    }
    fetchSubjects();
  }, []);

  const handleSubjectClick = (subjectId: string) => {
    navigate(`/practice?subject=${subjectId}`);
  };

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("subject-carousel");
    if (container) {
      const scrollAmount = 200;
      const newPosition = direction === "left" 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };

  if (subjects.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 px-4">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            Pick a Subject & <span className="neon-text">Start</span>
          </h2>
          <p className="text-muted-foreground text-sm">Jump into practice instantly</p>
        </motion.div>

        <div className="relative">
          {/* Left scroll button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex glass"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          {/* Carousel container */}
          <div
            id="subject-carousel"
            className="flex gap-4 overflow-x-auto scrollbar-hide px-2 py-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {subjects.map((subject, index) => {
              const IconComponent = iconMap[subject.icon] || BookOpen;
              const colorClass = colorVariants[index % colorVariants.length];

              return (
                <motion.button
                  key={subject.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSubjectClick(subject.id)}
                  className={`
                    flex-shrink-0 snap-center
                    flex flex-col items-center justify-center
                    w-28 h-28 sm:w-32 sm:h-32
                    rounded-2xl border
                    bg-gradient-to-br ${colorClass}
                    backdrop-blur-sm
                    transition-all duration-300
                    group cursor-pointer
                  `}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background/50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{subject.name}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Right scroll button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:flex glass"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
