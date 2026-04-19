import Link from "next/link";
import { TeamCardActions } from "@/components/teams/team-card-actions";
import { Badge } from "@/components/ui/badge";
import type { TeamRole } from "@/lib/constants/roles";
import type { Team } from "@/lib/constants/teams";

export function TeamCard({ team, userRole }: { team: Team; userRole?: TeamRole | null }) {
  return (
    <div className="group relative flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border bg-card p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
      <Link
        href={`/teams/${team.id}`}
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${team.name}`}
      />

      <div className="flex shrink-0 items-start justify-between gap-2">
        {/* Logo + name */}
        <div className="flex min-w-0 items-center gap-2.5">
          {team.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={team.logo_url}
              alt={`${team.name} logo`}
              className="h-9 w-9 flex-shrink-0 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-sm font-bold text-muted-foreground">
              {team.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="min-w-0 text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
            {team.name}
          </h3>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <Badge variant={team.is_active ? "success" : "muted"}>
            {team.is_active ? "Active" : "Inactive"}
          </Badge>
          <TeamCardActions team={team} userRole={userRole} />
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
