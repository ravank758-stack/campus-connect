import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRequests } from "@/lib/matches";
import { PageHeader } from "@/components/AppShell";
import { StudentAvatar } from "@/components/StudentAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Matches — SkillSwap Campus" }, { name: "description", content: "Manage your match requests." }] }),
  component: Requests,
});

function Requests() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useRequests(userId);
  const respond = async (id: string, status: "accepted" | "declined") => {
    const { error } = await supabase.from("match_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Matched! Say hi in chat." : "Request declined");
    qc.invalidateQueries({ queryKey: ["requests"] });
  };
  const groups = {
    incoming: data.filter((r) => r.receiver_id === userId && r.status === "pending"),
    sent: data.filter((r) => r.sender_id === userId && r.status === "pending"),
    matches: data.filter((r) => r.status === "accepted"),
  };

  return (
    <>
      <PageHeader title="Matches" subtitle="Requests you've received, sent, and your active swap partners." />
      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">Incoming ({groups.incoming.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({groups.sent.length})</TabsTrigger>
          <TabsTrigger value="matches">Matches ({groups.matches.length})</TabsTrigger>
        </TabsList>
        {(Object.keys(groups) as (keyof typeof groups)[]).map((k) => (
          <TabsContent key={k} value={k} className="mt-4 space-y-3">
            {groups[k].map((r, i) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
                <StudentAvatar name={r.other?.full_name ?? "?"} url={r.other?.avatar_url} />
                <div className="min-w-0 flex-1">
                  <Link to="/students/$id" params={{ id: r.other?.id ?? "" }} className="font-semibold hover:underline">{r.other?.full_name}</Link>
                  <p className="truncate text-sm text-muted-foreground">{r.message || r.other?.department}</p>
                </div>
                {k === "incoming" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-full" onClick={() => respond(r.id, "accepted")}>Accept</Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => respond(r.id, "declined")}>Decline</Button>
                  </div>
                )}
                {k === "sent" && <span className="text-sm text-muted-foreground">Awaiting reply</span>}
                {k === "matches" && <Button size="sm" asChild className="rounded-full"><Link to="/chat" search={{ r: r.id }}>Chat</Link></Button>}
              </div>
            ))}
            {groups[k].length === 0 && <p className="text-muted-foreground">Nothing here yet.</p>}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
