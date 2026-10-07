import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Bell, Calendar, Compass, Handshake, LayoutDashboard, LogOut, MessageCircle, Shield, User, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/requests", label: "Matches", icon: Handshake },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/sessions", label: "Sessions", icon: Calendar },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { userId, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("notif-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["unread"] });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/" });
  };

  const linkCls = "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";
  const active = { className: "bg-secondary !text-primary" };

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hero text-primary-foreground">⇄</span>
            <span className="hidden sm:inline">SkillSwap</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={linkCls} activeProps={active}>
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className={linkCls} activeProps={active}>
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {isAdmin && (
              <Link to="/admin" className="rounded-full p-2 text-muted-foreground hover:bg-secondary md:hidden" aria-label="Admin">
                <Shield className="h-5 w-5" />
              </Link>
            )}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-ai-chat"))}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 px-3 py-1.5 text-xs font-semibold text-primary hover:from-primary/25 hover:to-accent/25 transition-all shadow-sm"
              title="Ask AI Mentor"
            >
              <Bot className="h-4 w-4 text-accent" />
              <span className="hidden sm:inline">AI Mentor</span>
            </button>
            <Link to="/notifications" className="relative rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {unread}
                </span>
              )}
            </Link>
            <Link to="/profile" className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Profile">
              <User className="h-5 w-5" />
            </Link>
            <button onClick={signOut} className="rounded-full p-2 text-muted-foreground hover:bg-secondary" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-background/95 py-2 backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-0.5 px-2 text-[11px] text-muted-foreground" activeProps={{ className: "!text-primary" }}>
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-rise">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
