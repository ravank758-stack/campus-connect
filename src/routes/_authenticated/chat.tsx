import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Send } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRequests } from "@/lib/matches";
import { StudentAvatar } from "@/components/StudentAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: z.object({ r: z.string().optional() }),
  head: () => ({ meta: [{ title: "Chat — SkillSwap Campus" }, { name: "description", content: "Message your skill swap partners." }] }),
  component: Chat,
});

function Chat() {
  const { userId } = useAuth();
  const { r } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { data: reqs = [] } = useRequests(userId);
  const matches = reqs.filter((x) => x.status === "accepted");
  const current = matches.find((x) => x.id === r);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: msgs = [] } = useQuery({
    queryKey: ["messages", r],
    enabled: !!r,
    queryFn: async () => (await supabase.from("messages").select("*").eq("request_id", r!).order("created_at")).data ?? [],
  });

  useEffect(() => {
    if (!r) return;
    const ch = supabase.channel("chat-" + r)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `request_id=eq.${r}` }, () =>
        qc.invalidateQueries({ queryKey: ["messages", r] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [r, qc]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !r) return;
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({ request_id: r, sender_id: userId!, content });
    qc.invalidateQueries({ queryKey: ["messages", r] });
  };

  return (
    <div className="grid h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-card md:h-[calc(100vh-10rem)] md:grid-cols-[280px_1fr]">
      <aside className={`overflow-y-auto border-r border-border ${current ? "hidden md:block" : ""}`}>
        <p className="p-4 font-display text-lg font-semibold">Chats</p>
        {matches.map((m) => (
          <button key={m.id} onClick={() => navigate({ search: { r: m.id } })}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary ${m.id === r ? "bg-secondary" : ""}`}>
            <StudentAvatar name={m.other?.full_name ?? "?"} url={m.other?.avatar_url} />
            <span className="truncate font-medium">{m.other?.full_name}</span>
          </button>
        ))}
        {matches.length === 0 && <p className="p-4 text-sm text-muted-foreground">Accept a match request to start chatting. <Link to="/discover" className="text-primary">Discover →</Link></p>}
      </aside>
      <section className={`flex min-h-0 flex-col ${current ? "" : "hidden md:flex"}`}>
        {current ? (
          <>
            <div className="flex items-center gap-3 border-b border-border p-3">
              <button className="md:hidden" onClick={() => navigate({ search: {} })} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
              <StudentAvatar name={current.other?.full_name ?? "?"} url={current.other?.avatar_url} className="h-9 w-9" />
              <p className="font-semibold">{current.other?.full_name}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {msgs.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 animate-rise ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary"}`}>
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                      <p className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{format(new Date(m.created_at), "p")}</p>
                    </div>
                  </div>
                );
              })}
              {msgs.length === 0 && <p className="text-center text-sm text-muted-foreground">Say hello 👋</p>}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
              <Button type="submit" size="icon" aria-label="Send"><Send className="h-4 w-4" /></Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a conversation</div>
        )}
      </section>
    </div>
  );
}
