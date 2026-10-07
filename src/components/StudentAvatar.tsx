import { initials } from "@/lib/data";
import { cn } from "@/lib/utils";

export function StudentAvatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  return url ? (
    <img src={url} alt={name} className={cn("h-10 w-10 rounded-full object-cover", className)} />
  ) : (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hero font-display text-sm font-bold text-primary-foreground",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-accent" aria-label={`${value.toFixed(1)} stars`}>
      {"★★★★★".slice(0, Math.round(value))}
      <span className="text-muted-foreground/40">{"★★★★★".slice(Math.round(value))}</span>
    </span>
  );
}
