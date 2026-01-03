import { motion } from "framer-motion";
import { Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-mesh flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
        </Link>

        <div className="text-8xl font-display font-bold neon-text mb-4">404</div>
        
        <h1 className="font-display text-2xl font-bold mb-4">
          Lost in the question bank?
        </h1>
        
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist. Let's get you back to crushing MCQs.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="neon" size="lg" asChild>
            <Link to="/">
              <ArrowLeft className="w-5 h-5" />
              Go Home
            </Link>
          </Button>
          <Button variant="neon-outline" size="lg" asChild>
            <Link to="/practice">Start Practice</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
