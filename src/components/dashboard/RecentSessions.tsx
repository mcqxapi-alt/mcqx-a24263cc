import { motion } from "framer-motion";
import { Clock, BookOpen, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Session = {
  id: string;
  chapter_id: string;
  score: number;
  total_questions: number;
  completed_at: string;
  chapters?: { name: string; subjects?: { name: string; icon: string } };
};

type Props = {
  sessions: Session[];
  isLoading: boolean;
};

export function RecentSessions({ sessions, isLoading }: Props) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-2xl p-6 transition-all duration-300 hover:border-primary/30"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent Sessions
        </h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
              whileHover={{ x: 4, scale: 1.01 }}
              className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {session.chapters?.subjects?.icon || "📚"}
                </span>
                <div>
                  <div className="font-medium text-sm">
                    {session.chapters?.name || "Unknown Chapter"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(session.completed_at)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-accent">
                  {session.score}/{session.total_questions}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.round((session.score / session.total_questions) * 100)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No sessions yet</p>
          <Button variant="neon" size="sm" className="mt-3" asChild>
            <Link to="/practice">Start Practicing</Link>
          </Button>
        </div>
      )}
    </motion.div>
  );
}
