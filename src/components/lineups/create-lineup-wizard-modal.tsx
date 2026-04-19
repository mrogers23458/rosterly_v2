"use client";

import {
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { AiImportModal } from "@/components/import/ai-import-modal";
import { CreateLineupModal } from "@/components/lineups/create-lineup-modal";
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

type Method = "manual" | "ai";

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
    description: "Build your lineup manually — set batting order, positions, and rotations.",
  },
  {
    id:          "ai",
    icon:        <Sparkles className="h-5 w-5" />,
    label:       "AI import",
    description: "Upload a photo, screenshot, or document — AI extracts your lineup automatically.",
    accent:      true,
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

// ─── Wizard modal ─────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTeamId?: string;
  allTeams: Team[];
  allRosters: Roster[];
  rosterPlayersMap: Record<string, Player[]>;
};

export function CreateLineupWizardModal({
  open,
  onOpenChange,
  initialTeamId,
  allTeams,
  allRosters,
  rosterPlayersMap,
}: Props) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualKey,  setManualKey]  = useState(0);
  const [aiOpen,     setAiOpen]     = useState(false);
  const [aiKey,      setAiKey]      = useState(0);

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
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a lineup</DialogTitle>
            <DialogDescription>
              Choose how you&apos;d like to set up your game lineup.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <MethodPicker onPick={handlePick} />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <CreateLineupModal
        key={manualKey}
        initialTeamId={initialTeamId}
        allTeams={allTeams}
        allRosters={allRosters}
        rosterPlayersMap={rosterPlayersMap}
        open={manualOpen}
        onOpenChange={setManualOpen}
      />

      <AiImportModal
        key={`ai-${aiKey}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
        preselectedTeamId={initialTeamId}
      />
    </>
  );
}
