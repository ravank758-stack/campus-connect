import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — SkillSwap Campus" }, { name: "description", content: "Your latest updates." }] }),
  component: Notifications,
});

function Notifications() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["unread"] });
  };
  return (
    <>
      <PageHeader title="Notifications" action={<Button variant="outline" className="rounded-full" onClick={markAll}>Mark all read</Button>} />
      <div className="space-y-2">
        {data.map((n, i) => (
          <Link key={n.id} to={n.link} className={`flex items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-secondary animate-rise ${n.read ? "bg-card" : "bg-secondary/60"}`} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`} />
            <div className="flex-1">
              <p className="font-semibold">{n.title}</p>
              <p className="text-sm text-muted-foreground">{n.body}</p>
            </div>
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
          </Link>
        ))}
        {!data.length && <p className="text-muted-foreground">You're all caught up.</p>}
      </div>
    </>
  );
}
