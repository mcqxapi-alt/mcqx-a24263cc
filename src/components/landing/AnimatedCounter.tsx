import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: string;
  label: string;
  delay?: number;
}

export function AnimatedCounter({ value, label, delay = 0 }: AnimatedCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    if (!isInView) return;

    // Parse the value to extract number and suffix
    const numericMatch = value.match(/^([\d,]+)/);
    const suffix = value.replace(/^[\d,]+/, "");
    
    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const targetNumber = parseInt(numericMatch[1].replace(/,/g, ""));
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    const startDelay = delay * 100;

    const timeout = setTimeout(() => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime - startDelay;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(easeOut * targetNumber);
        
        // Format with commas
        const formatted = currentValue.toLocaleString();
        setDisplayValue(formatted + suffix);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [isInView, value, delay]);

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: delay * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.05, y: -2 }}
    >
      <div className="font-display text-2xl sm:text-3xl md:text-4xl font-bold neon-text-green tabular-nums">
        {displayValue}
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</div>
    </motion.div>
  );
}
