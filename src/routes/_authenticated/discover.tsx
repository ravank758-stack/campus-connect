import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { LEVELS, matchScore, useStudents } from "@/lib/data";
import { PageHeader } from "@/components/AppShell";
import { StudentCard } from "@/components/StudentCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover students — SkillSwap Campus" }, { name: "description", content: "Find students to swap skills with." }] }),
  component: Discover,
});

function Discover() {
  const { userId } = useAuth();
  const { data: students = [], isLoading } = useStudents();
  const me = students.find((s) => s.id === userId);
  const [q, setQ] = useState("");
  const [college, setCollege] = useState("all");
  const [dept, setDept] = useState("all");
  const [year, setYear] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("match");

  const uniq = (k: "college" | "department") => [...new Set(students.map((s) => s[k]).filter(Boolean))];
  const list = useMemo(() => {
    const ql = q.toLowerCase();
    return students
      .filter((s) => s.id !== userId)
      .filter((s) => !ql || s.full_name.toLowerCase().includes(ql) || s.skills.some((k) => k.name.toLowerCase().includes(ql)))
      .filter((s) => college === "all" || s.college === college)
      .filter((s) => dept === "all" || s.department === dept)
      .filter((s) => year === "all" || String(s.year) === year)
      .filter((s) => level === "all" || s.skills.some((k) => k.kind === "teach" && k.level === level))
      .map((s) => ({ s, m: matchScore(me, s) }))
      .sort((a, b) => (sort === "match" ? b.m - a.m : sort === "rating" ? b.s.rating - a.s.rating : 0));
  }, [students, me, userId, q, college, dept, year, level, sort]);

  const F = ({ v, set, label, opts }: { v: string; set: (x: string) => void; label: string; opts: { v: string; l: string }[] }) => (
    <Select value={v} onValueChange={set}>
      <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {opts.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <PageHeader title="Discover" subtitle="Find students whose skills complement yours." />
      <div className="mb-6 space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or skill…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <F v={college} set={setCollege} label="Colleges" opts={uniq("college").map((x) => ({ v: x, l: x }))} />
          <F v={dept} set={setDept} label="Departments" opts={uniq("department").map((x) => ({ v: x, l: x }))} />
          <F v={year} set={setYear} label="Years" opts={[1, 2, 3, 4, 5].map((y) => ({ v: String(y), l: `Year ${y}` }))} />
          <F v={level} set={setLevel} label="Levels" opts={LEVELS.map((l) => ({ v: l, l }))} />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="match">Best match</SelectItem><SelectItem value="rating">Top rated</SelectItem><SelectItem value="new">Newest</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(({ s, m }, i) => <StudentCard key={s.id} s={s} match={m} delay={Math.min(i, 8) * 50} />)}
          {list.length === 0 && <p className="text-muted-foreground">No students match these filters.</p>}
        </div>
      )}
    </>
  );
}
