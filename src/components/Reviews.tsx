import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { StudentAvatar, Stars } from "./StudentAvatar";

export function Reviews({ userId }: { userId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["reviews", userId],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)").eq("reviewee_id", userId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <section>
      <h2 className="mb-4 font-display text-xl font-semibold">Reviews ({data.length})</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <StudentAvatar name={r.reviewer?.full_name ?? "?"} url={r.reviewer?.avatar_url} className="h-8 w-8" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{r.reviewer?.full_name}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</p>
              </div>
              <Stars value={r.rating} />
            </div>
            {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
      </div>
    </section>
  );
}
