import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRequests(userId: string | null) {
  return useQuery({
    queryKey: ["requests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_requests")
        .select("*, sender:profiles!match_requests_sender_id_fkey(id, full_name, avatar_url, department), receiver:profiles!match_requests_receiver_id_fkey(id, full_name, avatar_url, department)")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, other: r.sender_id === userId ? r.receiver : r.sender }));
    },
  });
}
