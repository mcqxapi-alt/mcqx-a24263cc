import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

const examTags = [
  "CBSE",
  "ICSE",
  "State Boards",
  "CUET",
  "JEE Main",
  "NEET",
  "Class 9-12",
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/40">
      <div className="container py-10 sm:py-14 px-4">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Brand + About */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-base">MCQX</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              MCQX is India's modern MCQ practice platform built for serious learners.
              From <span className="text-foreground font-medium">CBSE, ICSE & State Board</span> students
              prepping for finals to aspirants grinding for{" "}
              <span className="text-foreground font-medium">CUET, JEE Main, NEET</span> and other
              competitive exams — we deliver verified, exam-pattern questions with
              instant explanations, adaptive difficulty, performance analytics, and
              real-time challenges with friends. Practice smarter, track every chapter,
              and turn weak areas into strengths.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {examTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground border border-border/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Explore</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/practice" className="hover:text-foreground transition-colors">
                  Start Practice
                </Link>
              </li>
              <li>
                <Link to="/challenge" className="hover:text-foreground transition-colors">
                  Challenge Mode
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-foreground transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2025 MCQX. Built for students preparing for boards & competitive exams.</p>
          <p>Practice. Compete. Win.</p>
        </div>
      </div>
    </footer>
  );
}
