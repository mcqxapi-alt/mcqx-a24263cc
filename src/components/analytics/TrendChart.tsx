import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

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

interface TrendChartProps {
  chapters: ChapterStats[];
}

export function TrendChart({ chapters }: TrendChartProps) {
  // Calculate trend summary
  const trendSummary = {
    improving: chapters.filter((c) => c.trend === "improving").length,
    declining: chapters.filter((c) => c.trend === "declining").length,
    stable: chapters.filter((c) => c.trend === "stable").length,
    new: chapters.filter((c) => c.trend === "new").length,
  };

  // Create mock progress data based on chapter stats
  // In a real app, this would come from historical data
  const generateMockProgressData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const baseAccuracy = chapters.length > 0 
      ? Math.round(chapters.reduce((sum, c) => sum + c.accuracy, 0) / chapters.length)
      : 50;
    
    return days.map((day, index) => ({
      day,
      accuracy: Math.max(0, Math.min(100, baseAccuracy + (Math.random() - 0.5) * 20 + index * 2)),
      questions: Math.floor(Math.random() * 20) + 5,
    }));
  };

  const progressData = generateMockProgressData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display font-bold text-lg">Weekly Progress</h3>
          <p className="text-xs text-muted-foreground mt-1">Your learning journey this week</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted/20">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Last 7 days</span>
        </div>
      </div>

      {/* Trend Summary Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
          <TrendingUp className="w-3 h-3" />
          {trendSummary.improving} improving
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
          <TrendingDown className="w-3 h-3" />
          {trendSummary.declining} declining
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 text-muted-foreground text-xs font-medium">
          <Minus className="w-3 h-3" />
          {trendSummary.stable} stable
        </div>
        {trendSummary.new > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            ✨ {trendSummary.new} new
          </div>
        )}
      </div>

      {/* Area Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={progressData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="day" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [
                name === "accuracy" ? `${Math.round(value)}%` : value,
                name === "accuracy" ? "Accuracy" : "Questions",
              ]}
            />
            <Area
              type="monotone"
              dataKey="accuracy"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#accuracyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Avg. Accuracy</p>
          <p className="font-bold text-primary">
            {Math.round(progressData.reduce((sum, d) => sum + d.accuracy, 0) / progressData.length)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Questions</p>
          <p className="font-bold">
            {progressData.reduce((sum, d) => sum + d.questions, 0)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Best Day</p>
          <p className="font-bold text-accent">
            {progressData.reduce((best, d) => (d.accuracy > best.accuracy ? d : best)).day}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
