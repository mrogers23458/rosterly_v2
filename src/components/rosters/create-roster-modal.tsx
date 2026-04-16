"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createRoster, type RosterFormState } from "@/app/actions/rosters";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SEASONS } from "@/lib/constants/teams";
import type { Team } from "@/lib/constants/teams";

const initialState: RosterFormState = {};

type CreateRosterModalProps = {
  teams: Team[];
  defaultTeamId?: string;
  /** When provided the modal is fully controlled — no trigger button is rendered. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
};

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function CreateRosterModal({
  teams, defaultTeamId, open: controlledOpen, onOpenChange,
}: CreateRosterModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = onOpenChange !== undefined;
  const open    = isControlled ? (controlledOpen ?? false) : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [state, action, pending] = useActionState(createRoster, initialState);
  const [isActive, setIsActive] = useState(true);
  const [yearError, setYearError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      setOpen(false);
    }
  }, [state.success, router, setOpen]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setFormKey((k) => k + 1);
      setIsActive(true);
      setYearError(null);
    }
    setOpen(next);
  }

  function handleYearBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (val && !/^\d{4}$/.test(val)) {
      setYearError("Year must be exactly 4 digits (e.g. 2026).");
    } else {
      setYearError(null);
    }
  }

  const activeTeams = teams.filter((t) => !t.is_archived);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Create roster
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a roster</DialogTitle>
          <DialogDescription>
            Add a new roster and associate it with one of your teams.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form key={formKey} action={action} noValidate className="flex flex-col gap-5">
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {/* Roster name */}
            <Field id="name" label="Roster name" required>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Spring 2026 Varsity"
                required
                autoFocus
              />
            </Field>

            {/* Team — optional; defaults to the page's team when provided */}
            <Field id="team_id" label="Team">
              <Select
                id="team_id"
                name="team_id"
                defaultValue={defaultTeamId ?? ""}
              >
                <option value="">None</option>
                {activeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.year ? ` (${t.year})` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Season + Year */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="season" label="Season" required>
                <Select id="season" name="season" required defaultValue="">
                  <option value="" disabled>Select season</option>
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </Field>

              <Field id="year" label="Year" required>
                <Input
                  id="year"
                  name="year"
                  placeholder="e.g. 2026"
                  required
                  maxLength={4}
                  onBlur={handleYearBlur}
                  onChange={() => yearError && setYearError(null)}
                  className={yearError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {yearError && (
                  <p className="text-xs text-destructive">{yearError}</p>
                )}
              </Field>
            </div>

            {/* Notes */}
            <Field id="notes" label="Notes">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Optional notes about this roster…"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </Field>

            {/* Active */}
            <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(c) => setIsActive(c === true)}
              />
              <Label htmlFor="is_active" className="cursor-pointer font-normal">
                Make active roster
              </Label>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                className="flex-1"
              >
                {pending ? "Creating…" : "Create roster"}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
