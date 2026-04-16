"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { updateRoster, type RosterFormState } from "@/app/actions/rosters";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogBody, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SEASONS } from "@/lib/constants/teams";
import type { Roster, Team } from "@/lib/constants/teams";

const initialState: RosterFormState = {};

type Props = {
  roster: Roster;
  teams: Team[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function EditRosterModal({ roster, teams, open, onOpenChange }: Props) {
  const router   = useRouter();
  const bound    = updateRoster.bind(null, roster.id, roster.team_id);
  const [state, action, pending] = useActionState(bound, initialState);

  const activeTeams = teams.filter((t) => !t.is_archived);
  const [formKey, setFormKey]    = useState(roster.id);
  const [isActive, setIsActive]  = useState(roster.is_active);

  useEffect(() => {
    if (open) { setFormKey(roster.id + Date.now()); setIsActive(roster.is_active); }
  }, [open, roster.id, roster.is_active]);

  useEffect(() => {
    if (state.success) { router.refresh(); onOpenChange(false); }
  }, [state.success, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit roster</DialogTitle>
          <DialogDescription>
            Editing <span className="font-medium text-foreground">{roster.name}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form key={formKey} action={action} noValidate className="flex flex-col gap-4">
            {state.error && (
              <Alert variant="destructive"><AlertDescription>{state.error}</AlertDescription></Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roster-name">Roster name <span className="text-destructive">*</span></Label>
              <Input id="roster-name" name="name" required defaultValue={roster.name} autoFocus />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roster-team">Team</Label>
              <Select id="roster-team" name="team_id" defaultValue={roster.team_id ?? ""}>
                <option value="">None</option>
                {activeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.year ? ` (${t.year})` : ""}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="roster-season">Season <span className="text-destructive">*</span></Label>
                <Select id="roster-season" name="season" defaultValue={roster.season}>
                  <option value="">—</option>
                  {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="roster-year">Year <span className="text-destructive">*</span></Label>
                <Input id="roster-year" name="year" maxLength={4} placeholder="2026"
                  defaultValue={roster.year} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="roster-notes">Notes</Label>
              <textarea id="roster-notes" name="notes" rows={2}
                defaultValue={roster.notes ?? ""}
                className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>

            <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
            <div className="flex items-center gap-2">
              <Checkbox id="roster-active" checked={isActive}
                onCheckedChange={(c) => setIsActive(c === true)} />
              <Label htmlFor="roster-active" className="cursor-pointer font-normal">Active roster</Label>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
              <Button type="button" variant="outline" size="lg" className="flex-1"
                onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={pending} className="flex-1">
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
