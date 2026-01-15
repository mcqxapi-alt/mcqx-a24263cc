import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Particle = {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
};

const COLORS = [
  "hsl(45, 93%, 58%)", // Gold
  "hsl(45, 100%, 70%)", // Light gold
  "hsl(var(--primary))", // Primary
  "hsl(var(--accent))", // Accent
  "hsl(0, 0%, 100%)", // White
];

export function VictoryConfetti({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 6,
        rotation: Math.random() * 360,
      }));
      setParticles(newParticles);

      // Clean up after animation
      const timeout = setTimeout(() => setParticles([]), 4000);
      return () => clearTimeout(timeout);
    }
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              opacity: 1,
              x: `${particle.x}vw`,
              y: -20,
              rotate: 0,
              scale: 1,
            }}
            animate={{
              opacity: [1, 1, 0],
              y: "110vh",
              rotate: particle.rotation + 720,
              scale: [1, 1, 0.5],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              boxShadow: `0 0 ${particle.size}px ${particle.color}`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
