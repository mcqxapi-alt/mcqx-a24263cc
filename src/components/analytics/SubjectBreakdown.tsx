import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

interface SubjectBreakdownProps {
  chapters: ChapterStats[];
  selectedSubject: string | null;
}

interface SubjectData {
  name: string;
  icon: string;
  accuracy: number;
  chapters: number;
  attempts: number;
}

export function SubjectBreakdown({ chapters, selectedSubject }: SubjectBreakdownProps) {
  // Aggregate by subject
  const subjectMap = new Map<string, { icon: string; correct: number; total: number; chapters: Set<string> }>();
  
  chapters.forEach((ch) => {
    const existing = subjectMap.get(ch.subject_name) || {
      icon: ch.subject_icon,
      correct: 0,
      total: 0,
      chapters: new Set(),
    };
    existing.correct += ch.correct_answers;
    existing.total += ch.total_attempts;
    existing.chapters.add(ch.chapter_id);
    subjectMap.set(ch.subject_name, existing);
  });

  const subjectData: SubjectData[] = Array.from(subjectMap.entries())
    .map(([name, data]) => ({
      name,
      icon: data.icon,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      chapters: data.chapters.size,
      attempts: data.total,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return "hsl(var(--accent))";
    if (accuracy >= 60) return "hsl(var(--primary))";
    if (accuracy >= 40) return "hsl(45, 100%, 50%)";
    return "hsl(var(--destructive))";
  };

  const filteredData = selectedSubject
    ? subjectData.filter((s) => s.name === selectedSubject)
    : subjectData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-lg">Subject Performance</h3>
          <p className="text-xs text-muted-foreground mt-1">Accuracy breakdown by subject</p>
        </div>
      </div>

      {filteredData.length > 0 ? (
        <>
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(value) => (value.length > 12 ? value.slice(0, 12) + "…" : value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, "Accuracy"]}
                />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredData.map((subject, index) => (
              <motion.div
                key={subject.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20"
              >
                <span className="text-xl">{subject.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{subject.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {subject.chapters} chapters • {subject.attempts} attempts
                  </p>
                </div>
                <div
                  className="px-2 py-1 rounded-lg text-xs font-bold"
                  style={{
                    backgroundColor: getBarColor(subject.accuracy).replace(")", " / 0.15)"),
                    color: getBarColor(subject.accuracy),
                  }}
                >
                  {subject.accuracy}%
                </div>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No subject data available yet.
        </div>
      )}
    </motion.div>
  );
}
