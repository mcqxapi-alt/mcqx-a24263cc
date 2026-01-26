import { motion } from "framer-motion";
import { BookOpen, Zap, Trophy } from "lucide-react";

const steps = [
  {
    icon: BookOpen,
    title: "Pick a chapter",
    description: "Choose from any subject",
    color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30",
    iconColor: "text-cyan-400",
  },
  {
    icon: Zap,
    title: "Smash MCQs",
    description: "Instant feedback on each",
    color: "from-green-500/20 to-green-500/5 border-green-500/30",
    iconColor: "text-green-400",
  },
  {
    icon: Trophy,
    title: "Track & flex",
    description: "Save streaks, challenge friends",
    color: "from-pink-500/20 to-pink-500/5 border-pink-500/30",
    iconColor: "text-pink-400",
  },
];

export function HowItWorks() {
  return (
    <section className="py-12 sm:py-20 px-4">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            How it works
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Three steps to MCQ mastery
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="relative group"
            >
              <div
                className={`
                  glass rounded-2xl p-8 h-full
                  transition-all duration-500
                  hover:border-primary/50
                  hover:shadow-[0_0_40px_hsl(var(--neon-cyan)/0.15)]
                  hover:-translate-y-1
                  bg-gradient-to-br ${step.color}
                  border
                `}
              >
                <div
                  className={`
                    w-14 h-14 rounded-xl bg-background/50
                    flex items-center justify-center mb-6
                    group-hover:scale-110 transition-all duration-300
                  `}
                >
                  <step.icon className={`w-7 h-7 ${step.iconColor}`} />
                </div>
                <div className="font-display text-sm text-primary mb-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  Step {i + 1}
                </div>
                <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
