"use client";

import {
  ClipboardList,
  FileUp,
  Link2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { AiImportModal } from "@/components/import/ai-import-modal";
import { GcImportModal } from "@/components/import/gc-import-modal";
import { GcImportPlayersModal } from "@/components/import/gc-import-players-modal";
import { SheetImportModal } from "@/components/import/sheet-import-modal";
import { AddPlayerModal } from "@/components/players/add-player-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Player, Roster, Team } from "@/lib/constants/teams";

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
    description: "Fill in the player's details — name, position, contact info and more.",
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
    description: "Export your roster from GameChanger and upload the CSV file.",
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

// ─── Props — supports both roster-specific and directory modes ────────────────

type RosterMode = {
  rosterId: string;
  teamId: string;
  existingPlayers: Player[];
};

type DirectoryMode = {
  directory: true;
  teams: Team[];
  rosters: Roster[];
};

type AddPlayerWizardProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
} & (RosterMode | DirectoryMode);

function isRosterMode(p: AddPlayerWizardProps): p is AddPlayerWizardProps & RosterMode {
  return "rosterId" in p;
}

// ─── Wizard modal ─────────────────────────────────────────────────────────────

export function AddPlayerWizardModal(props: AddPlayerWizardProps) {
  const { open, onOpenChange } = props;

  // Sub-modal open states
  const [manualOpen, setManualOpen] = useState(false);
  const [manualKey,  setManualKey]  = useState(0);
  const [aiOpen,     setAiOpen]     = useState(false);
  const [aiKey,      setAiKey]      = useState(0);
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [sheetKey,   setSheetKey]   = useState(0);
  const [gcOpen,     setGcOpen]     = useState(false);
  const [gcKey,      setGcKey]      = useState(0);

  function handlePick(method: Method) {
    onOpenChange(false);
    switch (method) {
      case "manual":
        setManualKey((k) => k + 1);
        setManualOpen(true);
        break;
      case "ai":
        setAiKey((k) => k + 1);
        setAiOpen(true);
        break;
      case "sheets":
        setSheetKey((k) => k + 1);
        setSheetOpen(true);
        break;
      case "gc":
        setGcKey((k) => k + 1);
        setGcOpen(true);
        break;
    }
  }

  const preselectedTeamId = isRosterMode(props) ? props.teamId : undefined;

  return (
    <>
      {/* Picker dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a player</DialogTitle>
            <DialogDescription>
              Choose how you&apos;d like to add players to your roster.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <MethodPicker onPick={handlePick} />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Manual — AddPlayerModal */}
      {isRosterMode(props) ? (
        <AddPlayerModal
          key={manualKey}
          rosterId={props.rosterId}
          teamId={props.teamId}
          open={manualOpen}
          onOpenChange={setManualOpen}
        />
      ) : (
        <AddPlayerModal
          key={manualKey}
          directory
          teams={props.teams}
          rosters={props.rosters}
          open={manualOpen}
          onOpenChange={setManualOpen}
        />
      )}

      {/* AI import */}
      <AiImportModal
        key={`ai-${aiKey}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
        preselectedTeamId={preselectedTeamId}
      />

      {/* Google Sheets */}
      <SheetImportModal
        key={`sheet-${sheetKey}`}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />

      {/* GameChanger */}
      {isRosterMode(props) ? (
        <GcImportPlayersModal
          key={`gc-${gcKey}`}
          teamId={props.teamId}
          rosterId={props.rosterId}
          existingPlayers={props.existingPlayers}
          open={gcOpen}
          onOpenChange={setGcOpen}
        />
      ) : (
        <GcImportModal
          key={`gc-${gcKey}`}
          open={gcOpen}
          onOpenChange={setGcOpen}
        />
      )}
    </>
  );
}
