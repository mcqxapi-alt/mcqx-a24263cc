import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, GraduationCap, Trophy, MapPin } from "lucide-react";
import mcqxLogo from "@/assets/mcqx-logo.png";

interface Board { id: string; name: string; type: string; }
interface ClassRecord { id: string; board_id: string; name: string; }
interface Subject { id: string; name: string; icon: string; class_id: string | null; }

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    async function fetch() {
      const [b, c, s] = await Promise.all([
        supabase.from("boards").select("id,name,type").order("display_order"),
        supabase.from("classes").select("id,board_id,name").order("display_order"),
        supabase.from("subjects").select("id,name,icon,class_id").order("display_order"),
      ]);
      if (b.data) setBoards(b.data);
      if (c.data) setClasses(c.data);
      if (s.data) setSubjects(s.data as Subject[]);
    }
    fetch();
  }, []);

  const typeIcon: Record<string, typeof GraduationCap> = {
    board: GraduationCap,
    competitive: Trophy,
    state: MapPin,
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
      <div className="container flex items-center justify-between h-24 sm:h-32 px-3 sm:px-4">
        <Link
          to="/"
          className="flex items-center gap-2 transition-transform duration-300 hover:scale-105"
        >
          <img
            src={mcqxLogo}
            alt="MCQX"
            className="h-20 sm:h-28 w-auto border-2 border-none shadow-none rounded-none"
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
