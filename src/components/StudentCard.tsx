import { Link } from "@tanstack/react-router";
import type { Student } from "@/lib/data";
import { StudentAvatar, Stars } from "./StudentAvatar";

export function StudentCard({ s, match, delay = 0 }: { s: Student; match?: number; delay?: number }) {
  const teach = s.skills.filter((k) => k.kind === "teach");
  const learn = s.skills.filter((k) => k.kind === "learn");
  return (
    <Link
      to="/students/$id"
      params={{ id: s.id }}
      className="card-lift block rounded-2xl border border-border bg-card p-5 shadow-card animate-rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <StudentAvatar name={s.full_name} url={s.avatar_url} className="h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{s.full_name || "Student"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[s.college, s.department, s.year ? `Year ${s.year}` : ""].filter(Boolean).join(" · ") || "Profile incomplete"}
          </p>
          {s.reviewCount > 0 && <p className="text-xs"><Stars value={s.rating} /> <span className="text-muted-foreground">({s.reviewCount})</span></p>}
        </div>
        {match !== undefined && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${match >= 60 ? "bg-success/15 text-success" : match >= 30 ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
            {match}%
          </span>
        )}
      </div>
      <div className="mt-4 space-y-2 text-xs">
        <div className="flex flex-wrap gap-1">
          <span className="mr-1 font-semibold text-muted-foreground">Teaches</span>
          {teach.length ? teach.slice(0, 4).map((k) => <span key={k.id} className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{k.name}</span>) : <span className="text-muted-foreground">—</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="mr-1 font-semibold text-muted-foreground">Learning</span>
          {learn.length ? learn.slice(0, 4).map((k) => <span key={k.id} className="rounded-full border border-border px-2 py-0.5">{k.name}</span>) : <span className="text-muted-foreground">—</span>}
        </div>
      </div>
    </Link>
  );
}
