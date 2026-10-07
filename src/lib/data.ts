import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Skill = Tables<"skills">;
export type Student = Profile & { skills: Skill[]; rating: number; reviewCount: number };

export const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
export const SLOTS = ["Weekday mornings", "Weekday afternoons", "Weekday evenings", "Weekends"];

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async (): Promise<Student[]> => {
      const [p, s, r] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("skills").select("*"),
        supabase.from("reviews").select("reviewee_id, rating"),
      ]);
      if (p.error) throw p.error;
      return (p.data ?? []).map((pr) => {
        const revs = (r.data ?? []).filter((x) => x.reviewee_id === pr.id);
        return {
          ...pr,
          skills: (s.data ?? []).filter((k) => k.user_id === pr.id),
          rating: revs.length ? revs.reduce((a, b) => a + b.rating, 0) / revs.length : 0,
          reviewCount: revs.length,
        };
      });
    },
  });
}

const norm = (x: string) => x.trim().toLowerCase();
const names = (s: Student, kind: string) => s.skills.filter((k) => k.kind === kind).map((k) => norm(k.name));

/** Match % = skills overlap both ways (70) + same college (15) + shared availability (15). */
export function matchScore(me: Student | undefined, other: Student) {
  if (!me) return 0;
  const myLearn = names(me, "learn"), myTeach = names(me, "teach");
  const theyLearn = names(other, "learn"), theyTeach = names(other, "teach");
  const a = myLearn.length ? myLearn.filter((x) => theyTeach.includes(x)).length / myLearn.length : 0;
  const b = theyLearn.length ? theyLearn.filter((x) => myTeach.includes(x)).length / theyLearn.length : 0;
  let score = ((a + b) / 2) * 70;
  if (me.college && norm(me.college) === norm(other.college)) score += 15;
  const shared = me.availability.filter((x) => other.availability.includes(x)).length;
  if (me.availability.length) score += (shared / me.availability.length) * 15;
  return Math.round(score);
}

export const initials = (n: string) =>
  n.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "?";
