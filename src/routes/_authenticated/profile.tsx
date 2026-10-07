import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LEVELS, SLOTS, useStudents } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reviews } from "@/components/Reviews";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — SkillSwap Campus" }, { name: "description", content: "Edit your student profile and skills." }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data: students = [] } = useStudents();
  const me = students.find((s) => s.id === userId);
  const [form, setForm] = useState({ full_name: "", college: "", department: "", year: 1, bio: "", availability: [] as string[] });
  const [skill, setSkill] = useState({ name: "", kind: "teach", level: "Intermediate" });

  useEffect(() => {
    if (me) setForm({ full_name: me.full_name, college: me.college, department: me.department, year: me.year, bio: me.bio, availability: me.availability });
  }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    const { error } = await supabase.from("profiles").update(form).eq("id", userId!);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["students"] });
  };
  const addSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skill.name.trim()) return;
    const { error } = await supabase.from("skills").insert({ ...skill, name: skill.name.trim(), user_id: userId! });
    if (error) return toast.error(error.message);
    setSkill({ ...skill, name: "" });
    qc.invalidateQueries({ queryKey: ["students"] });
  };
  const removeSkill = async (id: string) => {
    await supabase.from("skills").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["students"] });
  };
  const toggleSlot = (s: string) =>
    setForm((f) => ({ ...f, availability: f.availability.includes(s) ? f.availability.filter((x) => x !== s) : [...f.availability, s] }));

  return (
    <>
      <PageHeader title="My profile" subtitle="Tell other students who you are and what you can swap." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card animate-rise">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>College</Label><Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select value={String(form.year)} onValueChange={(v) => setForm({ ...form, year: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Availability</Label>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <button key={s} type="button" onClick={() => toggleSlot(s)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${form.availability.includes(s) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} className="rounded-full">Save profile</Button>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card animate-rise" style={{ animationDelay: "80ms" }}>
          <h2 className="font-display text-xl font-semibold">My skills</h2>
          <form onSubmit={addSkill} className="flex flex-wrap gap-2">
            <Input className="min-w-40 flex-1" placeholder="e.g. Python, Guitar" value={skill.name} onChange={(e) => setSkill({ ...skill, name: e.target.value })} />
            <Select value={skill.kind} onValueChange={(v) => setSkill({ ...skill, kind: v })}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="teach">I teach</SelectItem><SelectItem value="learn">I learn</SelectItem></SelectContent>
            </Select>
            <Select value={skill.level} onValueChange={(v) => setSkill({ ...skill, level: v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="submit">Add</Button>
          </form>
          {(["teach", "learn"] as const).map((kind) => (
            <div key={kind}>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">{kind === "teach" ? "Skills I can teach" : "Skills I want to learn"}</p>
              <div className="flex flex-wrap gap-2">
                {me?.skills.filter((k) => k.kind === kind).map((k) => (
                  <span key={k.id} className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${kind === "teach" ? "bg-secondary" : "border border-border"}`}>
                    {k.name} <span className="text-xs text-muted-foreground">· {k.level}</span>
                    <button onClick={() => removeSkill(k.id)} aria-label="Remove"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                {!me?.skills.some((k) => k.kind === kind) && <span className="text-sm text-muted-foreground">None yet</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {userId && <div className="mt-8"><Reviews userId={userId} /></div>}
    </>
  );
}
