import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Handshake, MessageCircle, Search, Star, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SkillSwap Campus — Trade skills with fellow students" },
      { name: "description", content: "Teach what you know, learn what you don't. Match with students on your campus, chat, schedule sessions and grow together." },
      { property: "og:title", content: "SkillSwap Campus — Trade skills with fellow students" },
      { property: "og:description", content: "Smart skill matching, chat and session scheduling for college students." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Target, title: "Smart matching", text: "See a match % based on what you teach, what you want to learn, your campus and free time." },
  { icon: Search, title: "Discover peers", text: "Search by skill, college, department, year and level." },
  { icon: Handshake, title: "Match requests", text: "Send a request, get accepted, start swapping." },
  { icon: MessageCircle, title: "Live chat", text: "Message your matches instantly to plan things out." },
  { icon: Calendar, title: "Sessions", text: "Schedule study sessions online or on campus." },
  { icon: Star, title: "Ratings & reviews", text: "Build a reputation as a great teacher and learner." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 text-primary-foreground">
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/15">⇄</span>
            SkillSwap Campus
          </span>
          <Link to="/auth" className="text-sm font-semibold hover:underline">Sign in</Link>
        </div>
      </header>
      <section className="bg-hero relative overflow-hidden text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-32 md:grid-cols-2 md:pt-40">
          <div className="animate-rise">
            <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">For college students</span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Teach what you know.<br />Learn what you don't.
            </h1>
            <p className="mt-5 max-w-md text-lg text-primary-foreground/80">
              Swap Python for guitar, design for calculus. Find classmates who complement your skills — no money, just knowledge.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth">Get started free <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
          <div className="relative hidden h-80 md:block">
            {[
              { n: "Aisha · CSE, Y3", t: "Teaches React", l: "Wants Guitar", m: 92, c: "left-0 top-0" },
              { n: "Rahul · Music, Y2", t: "Teaches Guitar", l: "Wants React", m: 88, c: "right-0 top-24" },
              { n: "Meera · Design, Y4", t: "Teaches Figma", l: "Wants SQL", m: 76, c: "left-12 bottom-0" },
            ].map((x, i) => (
              <div key={x.n} className={`absolute ${x.c} w-64 rounded-2xl bg-card p-4 text-card-foreground shadow-card animate-rise`} style={{ animationDelay: `${150 + i * 120}ms` }}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{x.n}</p>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">{x.m}%</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{x.t} · {x.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Everything you need to swap skills</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="card-lift rounded-2xl border border-border bg-card p-6 shadow-card animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} SkillSwap Campus</footer>
    </div>
  );
}
