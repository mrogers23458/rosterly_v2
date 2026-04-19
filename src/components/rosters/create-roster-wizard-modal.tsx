"use client";

import {
  ArrowLeft,
  ClipboardList,
  FileUp,
  Link2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createRoster, type RosterFormState } from "@/app/actions/rosters";
import { AiImportModal } from "@/components/import/ai-import-modal";
import { GcImportModal } from "@/components/import/gc-import-modal";
import { SheetImportModal } from "@/components/import/sheet-import-modal";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SEASONS } from "@/lib/constants/teams";
import type { Team } from "@/lib/constants/teams";

// ─── Method cards ─────────────────────────────────────────────────────────────

type Method = "manual" | "ai" | "sheets" | "gc";

const METHODS: {
  id: Method;
  icon: React.ReactNode;
  label: string;
  description: string;
  accent?: boolean;
}[] = [
  {
    id:          "manual",
    icon:        <ClipboardList className="h-5 w-5" />,
    label:       "Manual setup",
    description: "Fill in your roster details, then add players one by one.",
  },
  {
    id:          "ai",
    icon:        <Sparkles className="h-5 w-5" />,
    label:       "AI import",
    description: "Upload a CSV, photo, or screenshot — AI reads and extracts your roster automatically.",
    accent:      true,
  },
  {
    id:          "sheets",
    icon:        <Link2 className="h-5 w-5" />,
    label:       "Google Sheets",
    description: "Paste a public sheet URL — we fetch it and let you map the columns yourself.",
  },
  {
    id:          "gc",
    icon:        <FileUp className="h-5 w-5" />,
    label:       "GameChanger CSV",
    description: "Export your roster from the GameChanger app and upload the CSV file.",
  },
];

function MethodPicker({ onPick }: { onPick: (m: Method) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {METHODS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onPick(m.id)}
          className={cn(
            "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5",
            m.accent
              ? "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10"
              : "border-border bg-card",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              m.accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {m.icon}
          </div>
          <div>
            <p className={cn("text-sm font-semibold", m.accent && "text-primary")}>{m.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{m.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Inline manual form ───────────────────────────────────────────────────────

function Field({
  id, label, required, children,
}: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

const initialState: RosterFormState = {};

function CreateRosterForm({
  teams,
  defaultTeamId,
  onBack,
  onSuccess,
}: {
  teams: Team[];
  defaultTeamId?: string;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createRoster, initialState);
  const [isActive, setIsActive]   = useState(true);
  const [yearError, setYearError] = useState<string | null>(null);
  const [formKey, setFormKey]     = useState(0);
  const activeTeams = teams.filter((t) => !t.is_archived);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess();
    }
  }, [state.success, router, onSuccess]);

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
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Choose a different method
      </button>

      <form key={formKey} action={action} noValidate className="flex flex-col gap-5">
        {state.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <Field id="name" label="Roster name" required>
          <Input id="name" name="name" placeholder="e.g. Spring 2026 Varsity" required autoFocus />
        </Field>

        <Field id="team_id" label="Team">
          <Select id="team_id" name="team_id" defaultValue={defaultTeamId ?? ""}>
            <option value="">None</option>
            {activeTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.year ? ` (${t.year})` : ""}
              </option>
            ))}
          </Select>
        </Field>

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
              id="year" name="year" placeholder="e.g. 2026" required maxLength={4}
              onBlur={handleYearBlur}
              onChange={() => yearError && setYearError(null)}
              className={yearError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {yearError && <p className="text-xs text-destructive">{yearError}</p>}
          </Field>
        </div>

        <Field id="notes" label="Notes">
          <textarea
            id="notes" name="notes" rows={3}
            placeholder="Optional notes about this roster…"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </Field>

        <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
        <div className="flex items-center gap-2">
          <Checkbox id="is_active" checked={isActive} onCheckedChange={(c) => setIsActive(c === true)} />
          <Label htmlFor="is_active" className="cursor-pointer font-normal">Make active roster</Label>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={pending} className="flex-1">
            {pending ? "Creating…" : "Create roster"}
          </Button>
        </div>
      </form>
    </>
  );
}

// ─── Wizard modal ─────────────────────────────────────────────────────────────

type Props = {
  teams: Team[];
  defaultTeamId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CreateRosterWizardModal({ teams, defaultTeamId, open, onOpenChange }: Props) {
  const [view, setView] = useState<"pick" | "manual">("pick");

  const [aiOpen,    setAiOpen]    = useState(false);
  const [aiKey,     setAiKey]     = useState(0);
  const [gcOpen,    setGcOpen]    = useState(false);
  const [gcKey,     setGcKey]     = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey,  setSheetKey]  = useState(0);

  function handleOpenChange(v: boolean) {
    if (!v) setView("pick");
    onOpenChange(v);
  }

  function handlePick(method: Method) {
    switch (method) {
      case "manual":
        setView("manual");
        break;
      case "ai":
        setAiKey((k) => k + 1);
        setAiOpen(true);
        onOpenChange(false);
        break;
      case "sheets":
        setSheetKey((k) => k + 1);
        setSheetOpen(true);
        onOpenChange(false);
        break;
      case "gc":
        setGcKey((k) => k + 1);
        setGcOpen(true);
        onOpenChange(false);
        break;
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a roster</DialogTitle>
            <DialogDescription>
              {view === "pick"
                ? "Choose how you\u2019d like to set up your new roster."
                : "Fill in the basics. You can update any of these details later."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {view === "pick" && <MethodPicker onPick={handlePick} />}
            {view === "manual" && (
              <CreateRosterForm
                teams={teams}
                defaultTeamId={defaultTeamId}
                onBack={() => setView("pick")}
                onSuccess={() => handleOpenChange(false)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <AiImportModal
        key={`ai-${aiKey}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
        preselectedTeamId={defaultTeamId}
      />
      <SheetImportModal
        key={`sheet-${sheetKey}`}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <GcImportModal
        key={`gc-${gcKey}`}
        open={gcOpen}
        onOpenChange={setGcOpen}
        teamId={defaultTeamId}
      />
    </>
  );
}
