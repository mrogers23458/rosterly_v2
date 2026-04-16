import Link from "next/link";
import { TeamCardActions } from "@/components/teams/team-card-actions";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@/lib/constants/teams";

export function TeamCard({ team }: { team: Team }) {
  return (
    <div className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      <Link
        href={`/teams/${team.id}`}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${team.name}`}
      />

      <div className="flex shrink-0 items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
          {team.name}
        </h3>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <Badge variant={team.is_active ? "success" : "muted"}>
            {team.is_active ? "Active" : "Inactive"}
          </Badge>
          <TeamCardActions team={team} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {team.year && <>{team.year} · </>}
        {team.season} · {team.division} · {team.age_group} · {team.team_type}
      </p>
      {team.organization && (
        <p className="text-xs text-muted-foreground">{team.organization}</p>
      )}
      <div className="min-h-0 flex-1" aria-hidden />
    </div>
  );
}
