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
          {/* Explore dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="transition-all duration-300 text-xs sm:text-sm px-2 sm:px-3"
              >
                Explore <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass border-border/40">
              {["board", "competitive", "state"].map((type) => {
                const typeBoards = boards.filter((b) => b.type === type);
                const Icon = typeIcon[type] || GraduationCap;
                const label = type === "board" ? "Board Exams" : type === "competitive" ? "Competitive" : "State Boards";
                if (typeBoards.length === 0) {
                  return (
                    <DropdownMenuItem key={type} disabled className="text-muted-foreground text-xs">
                      <Icon className="w-4 h-4 mr-2" /> {label} — Coming soon
                    </DropdownMenuItem>
                  );
                }
                return typeBoards.map((board) => (
                  <DropdownMenuSub key={board.id}>
                    <DropdownMenuSubTrigger>
                      <Icon className="w-4 h-4 mr-2" /> {board.name}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="glass border-border/40">
                      {classes
                        .filter((c) => c.board_id === board.id)
                        .map((cls) => {
                          const clsSubjects = subjects.filter((s) => s.class_id === cls.id);
                          if (clsSubjects.length === 0) {
                            return (
                              <DropdownMenuItem key={cls.id} disabled className="text-xs text-muted-foreground">
                                {cls.name} — Coming soon
                              </DropdownMenuItem>
                            );
                          }
                          return (
                            <DropdownMenuSub key={cls.id}>
                              <DropdownMenuSubTrigger>{cls.name}</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="glass border-border/40 max-h-60 overflow-y-auto">
                                {clsSubjects.map((s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={() => navigate(`/practice?subject=${s.id}`)}
                                  >
                                    <span className="mr-2">{s.icon}</span> {s.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          );
                        })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ));
              })}
            </DropdownMenuContent>
          </DropdownMenu>

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
