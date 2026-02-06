import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface AccuracyRadialChartProps {
  accuracy: number;
  correct: number;
  incorrect: number;
}

export function AccuracyRadialChart({ accuracy, correct, incorrect }: AccuracyRadialChartProps) {
  const data = [
    { name: "Correct", value: correct, color: "hsl(var(--accent))" },
    { name: "Incorrect", value: incorrect, color: "hsl(var(--destructive))" },
  ];

  const getGradeMessage = (acc: number) => {
    if (acc >= 90) return "Outstanding! 🏆";
    if (acc >= 80) return "Excellent work! 🌟";
    if (acc >= 70) return "Good progress! 💪";
    if (acc >= 60) return "Keep pushing! 📈";
    return "Room to grow! 🚀";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-6"
    >
      <h3 className="font-display font-bold text-lg mb-4">Accuracy Overview</h3>
      
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display font-bold text-2xl">{accuracy}%</span>
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-sm text-muted-foreground">Correct</span>
            <span className="ml-auto font-mono font-bold text-accent">{correct}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-sm text-muted-foreground">Incorrect</span>
            <span className="ml-auto font-mono font-bold text-destructive">{incorrect}</span>
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium">{getGradeMessage(accuracy)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
