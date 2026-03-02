import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const didClearStaleSession = useRef(false);

  const clearStaleSessionLocally = async () => {
    if (didClearStaleSession.current) return;
    didClearStaleSession.current = true;

    // Local-only clear to avoid waiting on failing network calls
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setUser(null);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (event === "TOKEN_REFRESHED" && !nextSession) {
          await clearStaleSessionLocally();
          setLoading(false);
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session (guarded by timeout so UI never hangs)
    const sessionTimeoutMs = 1200;
    const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((resolve) => {
      setTimeout(() => {
        resolve({ data: { session: null }, error: new Error("Session check timeout") });
      }, sessionTimeoutMs);
    });

    Promise.race([supabase.auth.getSession(), timeoutPromise])
      .then(async (result) => {
        if (result.error) {
          await clearStaleSessionLocally();
          return;
        }

        setSession(result.data.session);
        setUser(result.data.session?.user ?? null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
