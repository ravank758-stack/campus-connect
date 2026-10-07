import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStudents } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Stars } from "@/components/StudentAvatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SkillSwap Campus" }, { name: "description", content: "Platform overview for administrators." }] }),
  component: Admin,
});

function Admin() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: students = [] } = useStudents();
  const { data } = useQuery({
    queryKey: ["admin"],
    enabled: isAdmin,
    queryFn: async () => {
      const [r, s, rev] = await Promise.all([
        supabase.from("match_requests").select("status"),
        supabase.from("sessions").select("status"),
        supabase.from("reviews").select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name), reviewee:profiles!reviews_reviewee_id_fkey(full_name)").order("created_at", { ascending: false }).limit(20),
      ]);
      return { reqs: r.data ?? [], sessions: s.data ?? [], reviews: rev.data ?? [] };
    },
  });
  if (!isAdmin) return <p className="text-muted-foreground">Admins only.</p>;

  const skillCounts = new Map<string, number>();
  students.flatMap((s) => s.skills).forEach((k) => skillCounts.set(k.name, (skillCounts.get(k.name) ?? 0) + 1));
  const topSkills = [...skillCounts].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const stats = [
    ["Students", students.length],
    ["Match requests", data?.reqs.length ?? 0],
    ["Accepted matches", data?.reqs.filter((r) => r.status === "accepted").length ?? 0],
    ["Sessions", data?.sessions.length ?? 0],
    ["Completed", data?.sessions.filter((s) => s.status === "completed").length ?? 0],
    ["Reviews", data?.reviews.length ?? 0],
  ];
  const removeReview = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Review removed");
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  return (
    <>
      <PageHeader title="Admin dashboard" subtitle="Platform health at a glance." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map(([l, v], i) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4 shadow-card animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="font-display text-3xl font-bold">{v}</p>
            <p className="text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-lg font-semibold">Students</h2>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>College</TableHead><TableHead>Skills</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Link to="/students/$id" params={{ id: s.id }} className="font-medium hover:underline">{s.full_name}</Link></TableCell>
                    <TableCell>{s.college || "—"}</TableCell>
                    <TableCell>{s.skills.length}</TableCell>
                    <TableCell>{format(new Date(s.created_at), "MMM d")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Popular skills</h2>
          <div className="space-y-2">
            {topSkills.map(([n, c]) => (
              <div key={n}>
                <div className="flex justify-between text-sm"><span>{n}</span><span className="text-muted-foreground">{c}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="bg-hero h-2 rounded-full" style={{ width: `${(c / (topSkills[0]?.[1] ?? 1)) * 100}%` }} /></div>
              </div>
            ))}
            {!topSkills.length && <p className="text-sm text-muted-foreground">No skills yet.</p>}
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Recent reviews</h2>
        <div className="space-y-2">
          {data?.reviews.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm">
              <Stars value={r.rating} />
              <span className="flex-1">{r.reviewer?.full_name} → {r.reviewee?.full_name}: {r.comment || <em className="text-muted-foreground">no comment</em>}</span>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeReview(r.id)}>Remove</Button>
            </div>
          ))}
          {!data?.reviews.length && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        </div>
      </div>
    </>
  );
}
