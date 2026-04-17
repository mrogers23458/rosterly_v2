"use client";

import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import { CreateTeamWizardModal } from "@/components/teams/create-team-wizard-modal";
import { Button } from "@/components/ui/button";

export function ManualSetupWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold leading-snug">Create a team</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Set up your team manually, import from GameChanger, or let AI extract it from a file or spreadsheet.
            </p>
          </div>
        </div>

        {/* Steps */}
        <ol className="flex flex-col gap-2">
          {[
            "Choose your setup method",
            "Review and confirm details",
            "Add players to your roster",
          ].map((step, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {/* CTA */}
        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create team
        </Button>
      </div>

      <CreateTeamWizardModal open={open} onOpenChange={setOpen} />
    </>
  );
}
