import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import mcqxLogo from "@/assets/mcqx-logo.png";

export function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
      <div className="container flex items-center justify-between h-28 sm:h-36 px-3 sm:px-4">
        <Link
          to="/"
          className="flex items-center gap-2 transition-transform duration-300 hover:scale-105"
        >
          <img
            src={mcqxLogo}
            alt="MCQX"
            className="h-24 sm:h-[7.5rem] w-auto"
          />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
          >
            <Link to="/leaderboard">Leaderboard</Link>
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          )}
          <Button variant="neon" size="sm" asChild className="text-xs sm:text-sm px-2 sm:px-4">
            <Link to="/practice">Start Practice</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
