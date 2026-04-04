import { Link } from "react-router-dom";
import { LogOut, Settings, Trophy, User, ChevronDown, Loader2, Shield } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import mcqxLogo from "@/assets/mcqx-logo.png";

type Props = {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | undefined;
  onSignOut: () => void;
  signingOut: boolean;
};

export function DashboardHeader({ displayName, avatarUrl, email, onSignOut, signingOut }: Props) {
  const { isAdmin } = useAdminCheck();
  const name = displayName || email?.split("@")[0] || "User";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
      <div className="container flex items-center justify-between h-16 sm:h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-105">
          <img src={mcqxLogo} alt="MCQX" className="h-10 sm:h-12 w-auto" />
        </Link>

        {/* Center tagline - hidden on mobile */}
        <span className="hidden md:block text-sm text-muted-foreground font-medium">
          Practice. Compete. Win.
        </span>

        {/* Profile Avatar with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 rounded-full hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50">
            <Avatar className="h-9 w-9 border-2 border-primary/30">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 glass border-border/50">
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                <Trophy className="w-4 h-4" />
                Challenge History
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-primary">
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onSignOut} 
              disabled={signingOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              {signingOut ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
