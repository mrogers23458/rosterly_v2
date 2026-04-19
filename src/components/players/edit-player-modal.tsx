"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { updatePlayer, type PlayerFormState } from "@/app/actions/players";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogBody, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  BATS_OPTIONS, POSITIONS, THROWS_OPTIONS, UNIFORM_SIZES,
} from "@/lib/constants/teams";
import type { Player } from "@/lib/constants/teams";

const initialState: PlayerFormState = {};

function Field({ id, label, required, children }: {
  id: string; label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function PositionCheckboxes({ name, selected, onChange }: {
  name: string; selected: string[];
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
          <Label htmlFor={`${name}-${pos}`} className="cursor-pointer font-normal text-sm">{pos}</Label>
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

type Props = {
  player: Player;
  teamId: string | null;
  rosterId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function EditPlayerModal({ player, teamId, rosterId, open, onOpenChange }: Props) {
  const router = useRouter();
  const boundAction = updatePlayer.bind(null, player.id, teamId, rosterId);
  const [state, action, pending] = useActionState(boundAction, initialState);
  const [formKey, setFormKey] = useState(player.id);

  // Dynamic state (needs pre-population from player)
  const [isActive, setIsActive]         = useState(player.is_active);
  const [dob, setDob]                   = useState(player.date_of_birth ?? "");
  const [primaryPos, setPrimaryPos]     = useState<string[]>(player.primary_positions ?? []);
  const [secondaryPos, setSecondaryPos] = useState<string[]>(player.secondary_positions ?? []);
  const [imageUrl, setImageUrl]         = useState<string | null>(player.image_url ?? null);

  const age = calculateAge(dob);

  // Reset state when modal opens for this player
  useEffect(() => {
    if (open) {
      setFormKey(player.id + Date.now());
      setIsActive(player.is_active);
      setDob(player.date_of_birth ?? "");
      setPrimaryPos(player.primary_positions ?? []);
      setSecondaryPos(player.secondary_positions ?? []);
      setImageUrl(player.image_url ?? null);
    }
  }, [open, player]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onOpenChange(false);
    }
  }, [state.success, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit player</DialogTitle>
          <DialogDescription>
            Editing <span className="font-medium text-foreground">
              {player.first_name} {player.last_name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form key={formKey} action={action} noValidate className="flex flex-col gap-5">
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {/* ── Player photo ─────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <Label>Player photo</Label>
              <AvatarUpload
                currentUrl={imageUrl}
                bucket="player-images"
                onUpload={setImageUrl}
                size={80}
                shape="circle"
                alt={`${player.first_name} ${player.last_name}`}
              />
              <input type="hidden" name="image_url" value={imageUrl ?? ""} />
            </div>

            {/* ── Player info ───────────────────────────────── */}
            <SectionHeading>Player info</SectionHeading>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="first_name" label="First name" required>
                <Input id="first_name" name="first_name" required autoFocus
                  defaultValue={player.first_name} />
              </Field>
              <Field id="last_name" label="Last name" required>
                <Input id="last_name" name="last_name" required
                  defaultValue={player.last_name} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="preferred_name" label="Preferred name / nickname">
                <Input id="preferred_name" name="preferred_name"
                  defaultValue={player.preferred_name ?? ""} />
              </Field>
              <Field id="jersey_number" label="Jersey number">
                <Input id="jersey_number" name="jersey_number"
                  defaultValue={player.jersey_number ?? ""} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="date_of_birth" label="Date of birth">
                <Input id="date_of_birth" name="date_of_birth" type="date"
                  value={dob} onChange={(e) => setDob(e.target.value)} />
              </Field>
              <Field id="age_display" label="Age">
                <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                  {age !== null ? `${age} years old` : dob ? "—" : "Enter DOB to calculate"}
                </div>
              </Field>
            </div>

            {/* ── Baseball info ─────────────────────────────── */}
            <SectionHeading>Baseball info</SectionHeading>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="bats" label="Bats">
                <Select id="bats" name="bats" defaultValue={player.bats ?? ""}>
                  <option value="">—</option>
                  {BATS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field id="throws" label="Throws">
                <Select id="throws" name="throws" defaultValue={player.throws ?? ""}>
                  <option value="">—</option>
                  {THROWS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            </div>

            <Field id="primary_positions" label="Primary positions">
              <PositionCheckboxes name="primary_positions" selected={primaryPos}
                onChange={(pos, c) => setPrimaryPos((prev) =>
                  c ? [...prev, pos] : prev.filter((p) => p !== pos))} />
            </Field>

            <Field id="secondary_positions" label="Secondary positions">
              <PositionCheckboxes name="secondary_positions" selected={secondaryPos}
                onChange={(pos, c) => setSecondaryPos((prev) =>
                  c ? [...prev, pos] : prev.filter((p) => p !== pos))} />
            </Field>

            {/* ── Roster status ─────────────────────────────── */}
            <SectionHeading>Roster status</SectionHeading>

            <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
            <div className="flex items-center gap-2">
              <Checkbox id="is_active" checked={isActive}
                onCheckedChange={(c) => setIsActive(c === true)} />
              <Label htmlFor="is_active" className="cursor-pointer font-normal">
                Active on roster
              </Label>
            </div>

            {/* ── Parent / Guardian ─────────────────────────── */}
            <SectionHeading>Parent / guardian</SectionHeading>

            <Field id="parent_guardian_name" label="Name">
              <Input id="parent_guardian_name" name="parent_guardian_name"
                defaultValue={player.parent_guardian_name ?? ""} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="parent_guardian_email" label="Email">
                <Input id="parent_guardian_email" name="parent_guardian_email" type="email"
                  defaultValue={player.parent_guardian_email ?? ""} />
              </Field>
              <Field id="parent_guardian_phone" label="Phone">
                <Input id="parent_guardian_phone" name="parent_guardian_phone" type="tel"
                  defaultValue={player.parent_guardian_phone ?? ""} />
              </Field>
            </div>

            {/* ── Additional ───────────────────────────────── */}
            <SectionHeading>Additional</SectionHeading>

            <Field id="uniform_size" label="Uniform size">
              <Select id="uniform_size" name="uniform_size" defaultValue={player.uniform_size ?? ""}>
                <option value="">—</option>
                {UNIFORM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>

            <Field id="medical_notes" label="Medical / allergy notes">
              <textarea id="medical_notes" name="medical_notes" rows={2}
                defaultValue={player.medical_notes ?? ""}
                className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </Field>

            <Field id="notes" label="Notes">
              <textarea id="notes" name="notes" rows={2}
                defaultValue={player.notes ?? ""}
                className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </Field>

            {/* ── Actions ──────────────────────────────────── */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
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
