import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="py-6 sm:py-8 px-4 border-t border-border/50">
      <div className="container flex flex-col items-center justify-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-primary flex items-center justify-center">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sm sm:text-base">MCQX</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors duration-300">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors duration-300">
            Privacy
          </Link>
          <a href="#" className="hover:text-foreground transition-colors duration-300">
            About
          </a>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          © 2025 MCQX. Built for students.
        </p>
      </div>
    </footer>
  );
}
