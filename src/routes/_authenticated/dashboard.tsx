import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Handshake, Star, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { matchScore, useStudents } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { StudentCard } from "@/components/StudentCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SkillSwap Campus" }, { name: "description", content: "Your skill swap overview." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { userId } = useAuth();
  const { data: students = [] } = useStudents();
  const me = students.find((s) => s.id === userId);
  const { data: stats } = useQuery({
    queryKey: ["dash", userId],
    queryFn: async () => {
      const [req, sess] = await Promise.all([
        supabase.from("match_requests").select("status, receiver_id"),
        supabase.from("sessions").select("*").eq("status", "scheduled").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(3),
      ]);
      const r = req.data ?? [];
      return {
        matches: r.filter((x) => x.status === "accepted").length,
        pending: r.filter((x) => x.status === "pending" && x.receiver_id === userId).length,
        upcoming: sess.data ?? [],
      };
    },
  });
  const top = students.filter((s) => s.id !== userId).map((s) => ({ s, m: matchScore(me, s) })).sort((a, b) => b.m - a.m).slice(0, 3);
  const incomplete = me && (!me.college || me.skills.length === 0);

  const cards = [
    { label: "Active matches", value: stats?.matches ?? 0, icon: Users },
    { label: "Pending requests", value: stats?.pending ?? 0, icon: Handshake },
    { label: "Upcoming sessions", value: stats?.upcoming.length ?? 0, icon: Calendar },
    { label: "Your rating", value: me?.reviewCount ? me.rating.toFixed(1) : "—", icon: Star },
  ];

  return (
    <>
      <PageHeader title={`Hey ${me?.full_name.split(" ")[0] ?? "there"} 👋`} subtitle="Here's what's happening with your skill swaps." />
      {incomplete && (
        <div className="bg-hero mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5 text-primary-foreground animate-rise">
          <p className="font-medium">Complete your profile and add skills to get better matches.</p>
          <Button asChild variant="secondary" className="rounded-full"><Link to="/profile">Complete profile</Link></Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-card animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <c.icon className="h-5 w-5 text-accent" />
            <p className="mt-3 font-display text-3xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Top matches for you</h2>
            <Link to="/discover" className="text-sm font-semibold text-primary">See all →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {top.map(({ s, m }, i) => <StudentCard key={s.id} s={s} match={m} delay={i * 80} />)}
            {top.length === 0 && <p className="text-muted-foreground">No other students yet — invite your classmates!</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Upcoming sessions</h2>
          <div className="space-y-3">
            {stats?.upcoming.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-4">
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{format(new Date(s.scheduled_at), "EEE, MMM d · p")} · {s.location}</p>
              </div>
            ))}
            {!stats?.upcoming.length && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
