import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Zap,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

interface ChapterStats {
  chapter_id: string;
  chapter_name: string;
  subject_name: string;
  subject_icon: string;
  total_attempts: number;
  correct_answers: number;
  accuracy: number;
  last_practiced: string | null;
  trend: "improving" | "declining" | "stable" | "new";
}

interface ChapterTableProps {
  chapters: ChapterStats[];
}

type SortKey = "accuracy" | "attempts" | "name" | "subject";
type SortOrder = "asc" | "desc";

export function ChapterTable({ chapters }: ChapterTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("accuracy");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getTrendIcon = (trend: ChapterStats["trend"]) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-3.5 h-3.5 text-accent" />;
      case "declining":
        return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (trend: ChapterStats["trend"]) => {
    switch (trend) {
      case "improving":
        return "Improving";
      case "declining":
        return "Declining";
      case "stable":
        return "Stable";
      default:
        return "New";
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-accent";
    if (accuracy >= 60) return "text-primary";
    if (accuracy >= 40) return "text-yellow-500";
    return "text-destructive";
  };

  const getProgressColor = (accuracy: number) => {
    if (accuracy >= 80) return "bg-accent";
    if (accuracy >= 60) return "bg-primary";
    if (accuracy >= 40) return "bg-yellow-500";
    return "bg-destructive";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder(key === "accuracy" ? "asc" : "desc");
    }
  };

  const filteredAndSorted = chapters
    .filter(
      (ch) =>
        ch.chapter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "accuracy":
          comparison = a.accuracy - b.accuracy;
          break;
        case "attempts":
          comparison = a.total_attempts - b.total_attempts;
          break;
        case "name":
          comparison = a.chapter_name.localeCompare(b.chapter_name);
          break;
        case "subject":
          comparison = a.subject_name.localeCompare(b.subject_name);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const SortButton = ({ sortKeyValue, label }: { sortKeyValue: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(sortKeyValue)}
      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
        sortKey === sortKeyValue ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {sortKey === sortKeyValue && (sortOrder === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display font-bold text-lg">Chapter Breakdown</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredAndSorted.length} chapters • Sorted by {sortKey}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-border">
        <span className="text-xs text-muted-foreground mr-2">Sort by:</span>
        <SortButton sortKeyValue="accuracy" label="Accuracy" />
        <SortButton sortKeyValue="attempts" label="Attempts" />
        <SortButton sortKeyValue="name" label="Name" />
        <SortButton sortKeyValue="subject" label="Subject" />
      </div>

      {/* Chapter List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {filteredAndSorted.map((chapter, index) => (
            <motion.div
              key={chapter.chapter_id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.02 }}
              className="group"
            >
              <div
                onClick={() => setExpandedId(expandedId === chapter.chapter_id ? null : chapter.chapter_id)}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all cursor-pointer"
              >
                <span className="text-lg flex-shrink-0">{chapter.subject_icon}</span>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{chapter.chapter_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{chapter.subject_name}</p>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  {getTrendIcon(chapter.trend)}
                  <span>{getTrendLabel(chapter.trend)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-16 sm:w-24">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${getAccuracyColor(chapter.accuracy)}`}>
                        {chapter.accuracy}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressColor(chapter.accuracy)}`}
                        style={{ width: `${chapter.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      expandedId === chapter.chapter_id ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              <AnimatePresence>
                {expandedId === chapter.chapter_id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 ml-4 border-l-2 border-border bg-muted/10 rounded-r-xl mt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Attempts</p>
                          <p className="font-bold">{chapter.total_attempts}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Correct</p>
                          <p className="font-bold text-accent">{chapter.correct_answers}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Incorrect</p>
                          <p className="font-bold text-destructive">
                            {chapter.total_attempts - chapter.correct_answers}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Practiced</p>
                          <p className="font-bold">{formatDate(chapter.last_practiced)}</p>
                        </div>
                      </div>
                      <Button size="sm" asChild className="gap-2">
                        <Link to={`/practice?chapter=${chapter.chapter_id}`}>
                          <Zap className="w-3.5 h-3.5" />
                          Practice Now
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAndSorted.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No chapters match your search." : "No chapters practiced yet."}
          </div>
        )}
      </div>
    </motion.div>
  );
}
