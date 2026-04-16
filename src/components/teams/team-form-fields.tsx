"use client";

import { useState } from "react";
import type { Team } from "@/lib/constants/teams";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AGE_GROUPS, DIVISIONS, SEASONS, TEAM_TYPES } from "@/lib/constants/teams";

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

type TeamFormFieldsProps = {
  defaults?: Partial<Team>;
};

export function TeamFormFields({ defaults }: TeamFormFieldsProps) {
  const [isActive, setIsActive] = useState(defaults?.is_active ?? true);
  const [yearError, setYearError] = useState<string | null>(null);

  function handleYearBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (val && !/^\d{4}$/.test(val)) {
      setYearError("Year must be exactly 4 digits (e.g. 2026).");
    } else {
      setYearError(null);
    }
  }

  return (
    <>
      {/* Team name */}
      <Field id="name" label="Team name" required>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Eastside Cubs"
          required
          defaultValue={defaults?.name ?? ""}
          autoFocus
        />
      </Field>

      {/* Year */}
      <Field id="year" label="Year" required>
        <Input
          id="year"
          name="year"
          placeholder="e.g. 2026"
          required
          maxLength={4}
          defaultValue={defaults?.year ?? ""}
          onBlur={handleYearBlur}
          onChange={() => yearError && setYearError(null)}
          className={yearError ? "border-destructive focus-visible:ring-destructive" : ""}
        />
        {yearError && (
          <p className="text-xs text-destructive">{yearError}</p>
        )}
      </Field>

      {/* Season + Team type */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="season" label="Season" required>
          <Select id="season" name="season" required defaultValue={defaults?.season ?? ""}>
            <option value="" disabled>Select season</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>

        <Field id="team_type" label="Team type" required>
          <Select id="team_type" name="team_type" required defaultValue={defaults?.team_type ?? ""}>
            <option value="" disabled>Select type</option>
            {TEAM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Division + Age group */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="division" label="Division" required>
          <Select id="division" name="division" required defaultValue={defaults?.division ?? ""}>
            <option value="" disabled>Select division</option>
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </Field>

        <Field id="age_group" label="Age group" required>
          <Select id="age_group" name="age_group" required defaultValue={defaults?.age_group ?? ""}>
            <option value="" disabled>Select age group</option>
            {AGE_GROUPS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Organization */}
      <Field id="organization" label="Organization / league">
        <Input
          id="organization"
          name="organization"
          placeholder="e.g. Eastside Little League"
          defaultValue={defaults?.organization ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Optional — the league or club this team belongs to.
        </p>
      </Field>

      {/* Active status */}
      <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
      <div className="flex items-center gap-2">
        <Checkbox
          id="is_active"
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <Label htmlFor="is_active" className="cursor-pointer font-normal">
          Mark team as active
        </Label>
      </div>
    </>
  );
}
