import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = { session: Session | null; userId: string | null; isAdmin: boolean; loading: boolean };
const Ctx = createContext<AuthCtx>({ session: null, userId: null, isAdmin: false, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return setIsAdmin(false);
    supabase.rpc("has_role", { _user_id: uid, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [session?.user.id]);

  return (
    <Ctx.Provider value={{ session, userId: session?.user.id ?? null, isAdmin, loading }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
