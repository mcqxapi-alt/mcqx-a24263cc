import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-12 sm:py-20 px-4">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 blur-3xl opacity-50 animate-pulse-slow" />
          <div className="relative glass rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-primary/20 hover:border-primary/40 transition-all duration-500">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
              Ready to become <span className="neon-text">unstoppable</span>?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
              Join thousands of students preparing for boards and competitive exams. CBSE, ICSE, CUET, JEE, NEET — all in one place. No signup required to start.
            </p>
            <Button variant="neon" size="xl" asChild className="group">
              <Link to="/practice">
                Start Practice Now
                <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
