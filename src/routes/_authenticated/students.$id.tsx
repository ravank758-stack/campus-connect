import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { matchScore, useStudents } from "@/lib/data";
import { StudentAvatar, Stars } from "@/components/StudentAvatar";
import { Reviews } from "@/components/Reviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/students/$id")({
  head: () => ({ meta: [{ title: "Student profile — SkillSwap Campus" }, { name: "description", content: "View a student's skills and reviews." }] }),
  component: StudentPage,
});

function StudentPage() {
  const { id } = Route.useParams();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data: students = [] } = useStudents();
  const s = students.find((x) => x.id === id);
  const me = students.find((x) => x.id === userId);
  const [msg, setMsg] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: req } = useQuery({
    queryKey: ["req-with", id],
    queryFn: async () => {
      const { data } = await supabase.from("match_requests").select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: false }).limit(1);
      return data?.[0] ?? null;
    },
  });

  if (!s) return <p className="text-muted-foreground">Loading…</p>;
  const m = matchScore(me, s);

  const send = async () => {
    const { error } = await supabase.from("match_requests").insert({ sender_id: userId!, receiver_id: id, message: msg });
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent!");
    qc.invalidateQueries({ queryKey: ["req-with", id] });
  };
  const review = async () => {
    const { error } = await supabase.from("reviews").insert({ reviewer_id: userId!, reviewee_id: id, rating, comment });
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your review!");
    setComment("");
    qc.invalidateQueries({ queryKey: ["reviews", id] });
    qc.invalidateQueries({ queryKey: ["students"] });
  };

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card animate-rise">
        <div className="bg-hero h-28" />
        <div className="-mt-12 flex flex-wrap items-end gap-4 px-6 pb-6">
          <StudentAvatar name={s.full_name} url={s.avatar_url} className="h-24 w-24 border-4 border-card text-2xl" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">{s.full_name}</h1>
            <p className="text-sm text-muted-foreground">{[s.college, s.department, `Year ${s.year}`].filter(Boolean).join(" · ")}</p>
            {s.reviewCount > 0 && <p className="text-sm"><Stars value={s.rating} /> {s.rating.toFixed(1)} ({s.reviewCount})</p>}
          </div>
          <div className="rounded-2xl bg-success/15 px-4 py-2 text-center">
            <p className="font-display text-2xl font-bold text-success">{m}%</p>
            <p className="text-xs text-muted-foreground">match</p>
          </div>
        </div>
        {s.bio && <p className="px-6 pb-6">{s.bio}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {(["teach", "learn"] as const).map((kind) => (
          <div key={kind} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">{kind === "teach" ? "Can teach" : "Wants to learn"}</h2>
            <div className="flex flex-wrap gap-2">
              {s.skills.filter((k) => k.kind === kind).map((k) => (
                <span key={k.id} className="rounded-full bg-secondary px-3 py-1 text-sm">{k.name} <span className="text-xs text-muted-foreground">· {k.level}</span></span>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold">Availability</h2>
          <ul className="space-y-1 text-sm">{s.availability.map((a) => <li key={a}>• {a}</li>)}</ul>
          {!s.availability.length && <p className="text-sm text-muted-foreground">Not set</p>}
        </div>
      </div>

      {id !== userId && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          {!req || req.status === "declined" ? (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Send a match request</h2>
              <Textarea placeholder="Hi! I'd love to learn from you and can teach you…" value={msg} onChange={(e) => setMsg(e.target.value)} />
              <Button onClick={send} className="rounded-full">Send request</Button>
            </div>
          ) : req.status === "pending" ? (
            <p className="font-medium">Request pending… {req.receiver_id === userId && <Link to="/requests" className="text-primary">Respond →</Link>}</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-full"><Link to="/chat" search={{ r: req.id }}>Open chat</Link></Button>
                <Button asChild variant="outline" className="rounded-full"><Link to="/sessions">Schedule a session</Link></Button>
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="font-semibold">Leave a review</h3>
                <div className="flex gap-1 text-2xl">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setRating(n)} className={n <= rating ? "text-accent" : "text-muted-foreground/30"}>★</button>
                  ))}
                </div>
                <Textarea placeholder="How was swapping skills with them?" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button variant="secondary" onClick={review}>Submit review</Button>
              </div>
            </div>
          )}
        </div>
      )}
      <Reviews userId={id} />
    </div>
  );
}
