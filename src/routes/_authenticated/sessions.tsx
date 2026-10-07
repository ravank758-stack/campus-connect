import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRequests } from "@/lib/matches";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({ meta: [{ title: "Sessions — SkillSwap Campus" }, { name: "description", content: "Schedule and track skill swap sessions." }] }),
  component: Sessions,
});

function Sessions() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data: reqs = [] } = useRequests(userId);
  const matches = reqs.filter((r) => r.status === "accepted");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ request_id: "", title: "", when: "", duration_minutes: 60, location: "Online" });

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", userId],
    queryFn: async () => (await supabase.from("sessions").select("*").or(`organizer_id.eq.${userId},partner_id.eq.${userId}`).order("scheduled_at")).data ?? [],
  });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const m = matches.find((x) => x.id === f.request_id);
    if (!m || !f.when) { toast.error("Pick a partner and time"); return; }
    const { error } = await supabase.from("sessions").insert({
      request_id: m.id, organizer_id: userId!, partner_id: m.other!.id, title: f.title,
      scheduled_at: new Date(f.when).toISOString(), duration_minutes: f.duration_minutes, location: f.location,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Session scheduled!");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };
  const setStatus = async (id: string, status: string) => {
    await supabase.from("sessions").update({ status }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["sessions"] });
  };
  const nameOf = (s: (typeof sessions)[number]) => matches.find((m) => m.id === s.request_id)?.other?.full_name ?? "Partner";
  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status !== "scheduled");

  return (
    <>
      <PageHeader title="Sessions" subtitle="Plan your learning meetups."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="rounded-full" disabled={!matches.length}>Schedule session</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New session</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div className="space-y-1.5"><Label>Partner</Label>
                  <Select value={f.request_id} onValueChange={(v) => setF({ ...f, request_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choose a match" /></SelectTrigger>
                    <SelectContent>{matches.map((m) => <SelectItem key={m.id} value={m.id}>{m.other?.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Topic</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Intro to React hooks" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Date & time</Label><Input type="datetime-local" required value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Minutes</Label><Input type="number" min={15} step={15} value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: Number(e.target.value) })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Location</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></div>
                <Button type="submit" className="w-full rounded-full">Schedule</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {!matches.length && <p className="mb-4 text-sm text-muted-foreground">You need an accepted match before scheduling a session.</p>}
      <h2 className="mb-3 font-display text-lg font-semibold">Upcoming</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {upcoming.map((s, i) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-5 shadow-card animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="font-display text-lg font-semibold">{s.title}</p>
            <p className="text-sm text-muted-foreground">with {nameOf(s)}</p>
            <div className="mt-3 space-y-1 text-sm">
              <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" />{format(new Date(s.scheduled_at), "EEEE, MMM d · p")}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" />{s.duration_minutes} min</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{s.location}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setStatus(s.id, "completed")}>Mark completed</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "cancelled")}>Cancel</Button>
            </div>
          </div>
        ))}
        {!upcoming.length && <p className="text-muted-foreground">No upcoming sessions.</p>}
      </div>
      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg font-semibold">History</h2>
          <div className="space-y-2">
            {past.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
                <span>{s.title} · {nameOf(s)} · {format(new Date(s.scheduled_at), "MMM d")}</span>
                <span className={s.status === "completed" ? "text-success" : "text-muted-foreground"}>{s.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
