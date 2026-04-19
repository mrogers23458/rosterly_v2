"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createPlayer, type PlayerFormState } from "@/app/actions/players";
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
import {
  BATS_OPTIONS,
  POSITIONS,
  THROWS_OPTIONS,
  UNIFORM_SIZES,
} from "@/lib/constants/teams";
import type { Roster, Team } from "@/lib/constants/teams";

const initialState: PlayerFormState = {};

type AddPlayerModalProps = {
  /** Controlled dialog — omit trigger; parent toggles `open`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & (
  | { rosterId: string; teamId: string }
  | { directory: true; teams: Team[]; rosters: Roster[] }
);

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

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

function PositionCheckboxes({
  name,
  selected,
  onChange,
}: {
  name: string;
  selected: string[];
  onChange: (pos: string, checked: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-5">
      {POSITIONS.map((pos) => (
        <div key={pos} className="flex items-center gap-1.5">
          <Checkbox
            id={`${name}-${pos}`}
            name={name}
            value={pos}
            checked={selected.includes(pos)}
            onCheckedChange={(c) => onChange(pos, c === true)}
          />
          <Label htmlFor={`${name}-${pos}`} className="cursor-pointer font-normal text-sm">
            {pos}
          </Label>
        </div>
      ))}
    </div>
  );
}

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function isDirectoryProps(p: AddPlayerModalProps): p is { directory: true; teams: Team[]; rosters: Roster[] } {
  return "directory" in p && p.directory === true;
}

export function AddPlayerModal(props: AddPlayerModalProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createPlayer, initialState);

  const isControlled = props.onOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? (props.open ?? false) : internalOpen;
  const [formKey, setFormKey]           = useState(0);
  const [isActive, setIsActive]         = useState(true);
  const [dob, setDob]                   = useState("");
  const [primaryPos, setPrimaryPos]     = useState<string[]>([]);
  const [secondaryPos, setSecondaryPos] = useState<string[]>([]);
  const [justAdded, setJustAdded]       = useState(false);

  const dir = isDirectoryProps(props);
  const [dirTeamKey, setDirTeamKey]     = useState<string>(""); // team id or "__none__"
  const [dirRosterId, setDirRosterId]   = useState<string>("");

  const rosterId = dir ? dirRosterId : props.rosterId;
  const rosterRow = dir ? props.rosters.find((r) => r.id === dirRosterId) : undefined;
  const teamId = dir
    ? (rosterRow?.team_id ?? (dirTeamKey === "__none__" ? "" : dirTeamKey))
    : props.teamId;

  const age = calculateAge(dob);

  const rostersForTeam = useMemo(() => {
    if (!isDirectoryProps(props)) return [];
    const { rosters } = props;
    if (!dirTeamKey) return [];
    if (dirTeamKey === "__none__") return rosters.filter((r) => !r.team_id);
    return rosters.filter((r) => r.team_id === dirTeamKey);
  }, [props, dirTeamKey]);

  const hasUnassigned = isDirectoryProps(props) && props.rosters.some((r) => !r.team_id);

  const onOpenChangeProp = props.onOpenChange;

  function resetFormFields() {
    setFormKey((k) => k + 1);
    setIsActive(true);
    setDob("");
    setPrimaryPos([]);
    setSecondaryPos([]);
    if (dir) {
      setDirTeamKey("");
      setDirRosterId("");
    }
  }

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    resetFormFields();
    setJustAdded(true);
    const t = window.setTimeout(() => setJustAdded(false), 3000);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success, router]);

  function handleOpenChange(next: boolean) {
    if (next) {
      resetFormFields();
    }
    if (isControlled) onOpenChangeProp?.(next);
    else setInternalOpen(next);
  }

  function togglePrimary(pos: string, checked: boolean) {
    setPrimaryPos((prev) =>
      checked ? [...prev, pos] : prev.filter((p) => p !== pos),
    );
  }

  function toggleSecondary(pos: string, checked: boolean) {
    setSecondaryPos((prev) =>
      checked ? [...prev, pos] : prev.filter((p) => p !== pos),
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="h-4 w-4" />
            Add player
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a player</DialogTitle>
          <DialogDescription>
            Fill in the player&apos;s details. Required fields are marked with <span className="text-destructive">*</span>.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form key={formKey} action={action} noValidate className="flex flex-col gap-5">
            <input type="hidden" name="roster_id" value={rosterId} />
            <input type="hidden" name="team_id" value={teamId} />

            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {justAdded && (
              <Alert variant="default" className="border-green-500/50 bg-green-50 text-green-800">
                <AlertDescription>Player added! Fill in the details below to add another.</AlertDescription>
              </Alert>
            )}

            {dir && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="dir_team" label="Team" required>
                  <Select
                    id="dir_team"
                    value={dirTeamKey}
                    onChange={(e) => {
                      setDirTeamKey(e.target.value);
                      setDirRosterId("");
                    }}
                    required
                  >
                    <option value="">Select team…</option>
                    {props.teams
                      .filter((t) => !t.is_archived)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.year ? ` (${t.year})` : ""}
                        </option>
                      ))}
                    {hasUnassigned && <option value="__none__">No team</option>}
                  </Select>
                </Field>
                <Field id="dir_roster" label="Roster" required>
                  <Select
                    id="dir_roster"
                    value={dirRosterId}
                    onChange={(e) => setDirRosterId(e.target.value)}
                    disabled={!dirTeamKey}
                    required
                  >
                    <option value="">
                      {dirTeamKey ? "Select roster…" : "Select a team first"}
                    </option>
                    {rostersForTeam.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {/* ── Basic info ───────────────────────────────────── */}
            <SectionHeading>Player info</SectionHeading>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="first_name" label="First name" required>
                <Input id="first_name" name="first_name" placeholder="e.g. Alex" required autoFocus />
              </Field>
              <Field id="last_name" label="Last name" required>
                <Input id="last_name" name="last_name" placeholder="e.g. Rivera" required />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="preferred_name" label="Preferred name / nickname">
                <Input id="preferred_name" name="preferred_name" placeholder="e.g. Ace" />
              </Field>
              <Field id="jersey_number" label="Jersey number">
                <Input id="jersey_number" name="jersey_number" placeholder="e.g. 12" />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="date_of_birth" label="Date of birth">
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </Field>
              <Field id="age_display" label="Age">
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {age !== null ? `${age} years old` : dob ? "—" : "Enter DOB to calculate"}
                </div>
              </Field>
            </div>

            {/* ── Baseball info ────────────────────────────────── */}
            <SectionHeading>Baseball info</SectionHeading>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="bats" label="Bats">
                <Select id="bats" name="bats" defaultValue="">
                  <option value="">—</option>
                  {BATS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field id="throws" label="Throws">
                <Select id="throws" name="throws" defaultValue="">
                  <option value="">—</option>
                  {THROWS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field id="primary_positions" label="Primary positions">
              <PositionCheckboxes
                name="primary_positions"
                selected={primaryPos}
                onChange={togglePrimary}
              />
            </Field>

            <Field id="secondary_positions" label="Secondary positions">
              <PositionCheckboxes
                name="secondary_positions"
                selected={secondaryPos}
                onChange={toggleSecondary}
              />
            </Field>

            {/* ── Roster status ─────────────────────────────────── */}
            <SectionHeading>Roster status</SectionHeading>

            <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={isActive}
                onCheckedChange={(c) => setIsActive(c === true)}
              />
              <Label htmlFor="is_active" className="cursor-pointer font-normal">
                Active on roster
              </Label>
            </div>

            {/* ── Parent / Guardian ─────────────────────────────── */}
            <SectionHeading>Parent / guardian</SectionHeading>

            <Field id="parent_guardian_name" label="Name">
              <Input id="parent_guardian_name" name="parent_guardian_name" placeholder="Full name" />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="parent_guardian_email" label="Email">
                <Input id="parent_guardian_email" name="parent_guardian_email" type="email" placeholder="email@example.com" />
              </Field>
              <Field id="parent_guardian_phone" label="Phone">
                <Input id="parent_guardian_phone" name="parent_guardian_phone" type="tel" placeholder="(555) 000-0000" />
              </Field>
            </div>

            {/* ── Additional ───────────────────────────────────── */}
            <SectionHeading>Additional</SectionHeading>

            <Field id="uniform_size" label="Uniform size">
              <Select id="uniform_size" name="uniform_size" defaultValue="">
                <option value="">—</option>
                {UNIFORM_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>

            <Field id="medical_notes" label="Medical / allergy notes">
              <textarea
                id="medical_notes"
                name="medical_notes"
                rows={2}
                placeholder="Any medical conditions or allergies the coach should know about…"
                className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </Field>

            <Field id="notes" label="Notes">
              <textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Any other notes…"
                className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </Field>

            {/* ── Actions ──────────────────────────────────────── */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                {justAdded ? "Done" : "Cancel"}
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={pending || (dir && (!dirTeamKey || !dirRosterId))}
                className="flex-1"
              >
                {pending ? "Adding…" : "Add player"}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
