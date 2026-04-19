"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { TeamsArchivedSection } from "@/components/teams/teams-archived-section";
import { TeamsDirectory } from "@/components/teams/teams-directory";
import { CreateTeamWizardModal } from "@/components/teams/create-team-wizard-modal";
import { Button } from "@/components/ui/button";
import type { Team } from "@/lib/constants/teams";
import type { TeamRole } from "@/lib/constants/roles";

type Props = {
  activeTeams:   Team[];
  archivedTeams: Team[];
  teamRoles:     Record<string, TeamRole>;
  error:         boolean;
};

/**
 * Client wrapper for the /teams page.
 *
 * Wizard state lives here — outside of the conditional TeamsEmptyState render —
 * so that the GcImportModal is never unmounted mid-flow when the first team is
 * created and the page transitions from "no teams" to "has teams".
 */
export function TeamsPageContent({ activeTeams, archivedTeams, teamRoles, error }: Props) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardKey,  setWizardKey]  = useState(0);

  function openWizard() {
    setWizardKey((k) => k + 1);
    setWizardOpen(true);
  }

  const hasTeams = activeTeams.length > 0 || archivedTeams.length > 0;

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Teams</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your teams and seasons. Search below, or create and import from the toolbar.
          </p>
        </div>

        {!error && (
          <Button type="button" onClick={openWizard}>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        )}
      </div>

      {/* ── Error banner ────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load teams. Please try again.
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!error && !hasTeams && (
        <TeamsEmptyStateInline onCreateTeam={openWizard} />
      )}

      {/* ── Active teams ────────────────────────────────────────────── */}
      {!error && activeTeams.length > 0 && (
        <TeamsDirectory teams={activeTeams} teamRoles={teamRoles} />
      )}

      {/* ── Archived teams ──────────────────────────────────────────── */}
      {!error && archivedTeams.length > 0 && (
        <TeamsArchivedSection teams={archivedTeams} teamRoles={teamRoles} />
      )}

      {/* ── Wizard modal — always in THIS component tree so it is never
           unmounted when the empty→has-teams transition happens ─────── */}
      <CreateTeamWizardModal
        key={wizardKey}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />
    </>
  );
}

// ── Inline empty state ────────────────────────────────────────────────────────
// (Kept here intentionally so it shares state with the wizard above and doesn't
//  need its own modal instance that would get unmounted on first-team creation.)

import { Users } from "lucide-react";

function TeamsEmptyStateInline({ onCreateTeam }: { onCreateTeam: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Users className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <div>
        <p className="font-semibold">No teams yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first team manually, import from a spreadsheet, or let AI do the heavy lifting.
        </p>
      </div>
      <Button onClick={onCreateTeam}>
        <Plus className="mr-2 h-4 w-4" />
        Create your first team
      </Button>
    </div>
  );
}
