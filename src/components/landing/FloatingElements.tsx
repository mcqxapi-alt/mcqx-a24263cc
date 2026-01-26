import { motion } from "framer-motion";

export function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large floating orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-30"
        style={{
          background: "radial-gradient(circle, hsl(var(--neon-cyan) / 0.4) 0%, transparent 70%)",
          left: "-10%",
          top: "10%",
        }}
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[80px] opacity-25"
        style={{
          background: "radial-gradient(circle, hsl(var(--neon-green) / 0.4) 0%, transparent 70%)",
          right: "-5%",
          top: "30%",
        }}
        animate={{
          x: [0, -40, 30, 0],
          y: [0, 50, -20, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <motion.div
        className="absolute w-[350px] h-[350px] rounded-full blur-[90px] opacity-20"
        style={{
          background: "radial-gradient(circle, hsl(var(--neon-purple) / 0.4) 0%, transparent 70%)",
          left: "30%",
          bottom: "10%",
        }}
        animate={{
          x: [0, 30, -50, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.05, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

      {/* Small floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/60"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Geometric shapes */}
      <motion.div
        className="absolute w-16 h-16 border border-primary/20 rotate-45"
        style={{
          right: "15%",
          top: "15%",
        }}
        animate={{
          rotate: [45, 135, 45],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-24 h-24 border border-accent/15 rounded-full"
        style={{
          left: "10%",
          bottom: "20%",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      <motion.div
        className="absolute w-12 h-12 border border-primary/10"
        style={{
          right: "25%",
          bottom: "30%",
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
        }}
        animate={{
          rotate: [0, 360],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
