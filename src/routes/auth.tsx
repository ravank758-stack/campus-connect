import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SkillSwap Campus" },
      { name: "description", content: "Sign in or create your SkillSwap Campus student account." },
      { property: "og:title", content: "Sign in — SkillSwap Campus" },
      { property: "og:description", content: "Join students swapping skills on campus." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else toast.success("Check your email to confirm your account!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="bg-hero hidden flex-col justify-between p-10 text-primary-foreground md:flex">
        <Link to="/" className="font-display text-xl font-bold">⇄ SkillSwap Campus</Link>
        <p className="font-display text-4xl font-bold leading-tight">Your campus is full of teachers. Including you.</p>
        <p className="text-primary-foreground/70">Swap skills · Build friendships · Grow together</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 animate-rise">
          <h1 className="font-display text-3xl font-bold">{mode === "in" ? "Welcome back" : "Create account"}</h1>
          <Button type="button" variant="outline" className="w-full rounded-full" onClick={google}>Continue with Google</Button>
          <div className="text-center text-xs text-muted-foreground">or with email</div>
          {mode === "up" && (
            <div className="space-y-1.5"><Label>Full name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          )}
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button disabled={busy} className="w-full rounded-full">{mode === "in" ? "Sign in" : "Sign up"}</Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "in" ? "New here?" : "Already have an account?"}{" "}
            <button type="button" className="font-semibold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
