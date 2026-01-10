import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import mcqxLogo from "@/assets/mcqx-logo.png";

export default function Login() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created!",
          description: "You're now signed in.",
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-mesh flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <img src={mcqxLogo} alt="MCQX" className="h-20 sm:h-28 w-auto" />
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground">
              {isSignUp
                ? "Sign up to track your progress"
                : "Sign in to track your streaks & challenges"}
            </p>
          </div>

          <div className="glass rounded-2xl p-8 space-y-4">
            {!showEmailForm ? (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3"
                  onClick={handleGoogleSignIn}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start gap-3"
                  disabled
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  Continue with Apple
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full justify-start gap-3"
                  onClick={() => setShowEmailForm(true)}
                >
                  <Mail className="w-5 h-5" />
                  Continue with Email
                </Button>
              </>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                    minLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  variant="neon"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowEmailForm(false)}
                >
                  ← Back to options
                </Button>
              </form>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            )}
            <br />
            <Link to="/practice" className="text-primary hover:underline">
              Skip for now →
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
