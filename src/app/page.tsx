import {
  CheckCircle,
  Clock,
  Users,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import { RosterlyLogo } from "@/components/branding/rosterly-logo";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Rosters that stay current",
    body: "One list for players, positions, and jersey numbers so everyone sees the same information.",
    Icon: Users,
  },
  {
    title: "Lineups without the scramble",
    body: "Build and share batting orders and defensive alignments before you reach the field.",
    Icon: BarChart2,
  },
  {
    title: "Availability at a glance",
    body: "Know who can make practice or game day without chasing replies across group chats.",
    Icon: Clock,
  },
  {
    title: "Stats that stay simple",
    body: "Track what matters for development and parent updates—without turning every game into a spreadsheet.",
    Icon: CheckCircle,
  },
];

const steps = [
  {
    title: "Create your team space",
    body: "Set up a home for your season in a few minutes—no technical background required.",
  },
  {
    title: "Invite the adults who help",
    body: "Share access with assistant coaches and team parents when you are ready.",
  },
  {
    title: "Keep the season organized",
    body: "Update rosters, lineups, and availability as the calendar moves—everything stays in one place.",
  },
];

const audiences = [
  {
    title: "Head and assistant coaches",
    body: "Spend less time on logistics and more time teaching the game.",
  },
  {
    title: "Team parents and volunteers",
    body: "Step in with confidence even if you are new to coordinating a roster or dugout.",
  },
  {
    title: "League-minded organizers",
    body: "Start small with a single team foundation that can grow with your program.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-10 border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link href="/" className="flex flex-1 items-center gap-2.5">
            <RosterlyLogo size={36} priority />
            <span className="text-base font-bold text-foreground sm:text-lg">
              Rosterly
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">
                <span className="hidden sm:inline">Create account</span>
                <span className="sm:hidden">Sign up</span>
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="bg-primary px-4 py-16 text-primary-foreground sm:px-6 sm:py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-80 sm:text-sm">
              Youth baseball team management
            </p>
            <h1 className="mb-5 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              Organize your baseball team in one calm, dependable place.
            </h1>
            <p className="mb-8 max-w-2xl text-base leading-relaxed opacity-90 md:text-lg">
              Rosterly helps volunteer coaches and parents manage rosters,
              lineups, availability, and simple stats without juggling messages,
              documents, and last-minute changes.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
            >
              <Link href="/signup">Get started free</Link>
            </Button>
            <p className="mt-4 text-sm opacity-75">
              Built for rec leagues, travel teams, and school programs where
              clarity matters as much as competition.
            </p>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="px-4 py-14 sm:px-6 md:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Highlights
            </p>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
              Everything you need for the day-to-day season
            </h2>
            <p className="mb-10 max-w-xl text-sm text-muted-foreground sm:text-base">
              Practical tools that respect your time—so coaching stays about
              kids, not paperwork.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {features.map(({ title, body, Icon }) => (
                <div
                  key={title}
                  className="rounded-lg border border-border p-5 md:p-6"
                >
                  <Icon className="mb-3 h-6 w-6 text-primary" aria-hidden />
                  <h3 className="mb-1.5 font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="bg-muted px-4 py-14 sm:px-6 md:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              How it works
            </p>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
              From first practice to the last out
            </h2>
            <p className="mb-10 max-w-xl text-sm text-muted-foreground sm:text-base">
              A straightforward flow you can explain to any parent on the
              bleachers.
            </p>
            <div className="flex flex-col gap-4">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-white p-5 sm:flex-row sm:items-start md:p-6"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who it is for ── */}
        <section className="px-4 py-14 sm:px-6 md:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Who it is for
            </p>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
              Made for real dugouts and real schedules
            </h2>
            <p className="mb-10 max-w-xl text-sm text-muted-foreground sm:text-base">
              Whether you have coached for years or are helping for the first
              time, the goal is the same: fewer surprises and more time with
              players.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {audiences.map(({ title, body }) => (
                <div key={title} className="rounded-lg bg-muted p-5">
                  <h3 className="mb-1.5 font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-primary px-4 py-14 text-primary-foreground sm:px-6 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
              Ready to simplify your season?
            </h2>
            <p className="mb-8 text-sm opacity-90 sm:text-base">
              Create an account to open your team workspace, or log in if you
              are already set up.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-primary hover:bg-white/90"
              >
                <Link href="/signup">Create account</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-border px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs text-muted-foreground sm:text-sm">
              © {new Date().getFullYear()} Rosterly. A quiet foundation for
              youth baseball teams.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
