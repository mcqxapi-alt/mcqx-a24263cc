import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ChallengeCountdownProps = {
  startedAt: string;
  onComplete: () => void;
};

export function ChallengeCountdown({ startedAt, onComplete }: ChallengeCountdownProps) {
  const [count, setCount] = useState<number | "GO">(3);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    const now = Date.now();
    const diff = startTime - now;

    // Calculate initial count based on time remaining
    const initialCount = Math.ceil(diff / 1000);
    
    if (initialCount <= 0) {
      onComplete();
      return;
    }

    setCount(Math.min(3, initialCount));

    const interval = setInterval(() => {
      const remaining = startTime - Date.now();
      
      if (remaining <= 0) {
        setCount("GO");
        clearInterval(interval);
        
        // Wait for "GO" animation then trigger complete
        setTimeout(() => {
          onComplete();
        }, 600);
      } else {
        const newCount = Math.ceil(remaining / 1000);
        setCount(Math.min(3, newCount));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startedAt, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={count.toString()}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="relative"
        >
          {/* Glowing background */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ 
              duration: 0.5,
              repeat: Infinity,
            }}
            className="absolute inset-0 -m-20 rounded-full bg-primary/30 blur-3xl"
          />
          
          {/* Count number */}
          <motion.span
            className={`relative font-display font-black ${
              count === "GO" 
                ? "text-[8rem] sm:text-[12rem] text-primary neon-text" 
                : "text-[10rem] sm:text-[14rem] text-foreground"
            }`}
          >
            {count}
          </motion.span>
        </motion.div>
      </AnimatePresence>
      
      {/* Decorative rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute w-64 h-64 rounded-full border-2 border-dashed border-primary/20"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute w-80 h-80 rounded-full border border-dotted border-accent/10"
      />
    </motion.div>
  );
}
