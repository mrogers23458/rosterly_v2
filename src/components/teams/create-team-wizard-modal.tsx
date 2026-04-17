"use client";

import {
  ArrowLeft,
  ClipboardList,
  FileUp,
  Link2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { CreateTeamForm } from "@/app/teams/new/create-team-form";
import { AiImportModal } from "@/components/import/ai-import-modal";
import { GcImportModal } from "@/components/import/gc-import-modal";
import { SheetImportModal } from "@/components/import/sheet-import-modal";
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

// ─── Method option cards ──────────────────────────────────────────────────────

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
    description: "Fill in your team details, then add a roster and players one by one.",
  },
  {
    id:          "ai",
    icon:        <Sparkles className="h-5 w-5" />,
    label:       "AI import",
    description: "Upload a CSV, photo, or screenshot — AI reads and extracts your team automatically.",
    accent:      true,
  },
  {
    id:          "sheets",
    icon:        <Link2 className="h-5 w-5" />,
    label:       "Google Sheets",
    description: "Paste a public sheet URL — we fetch it and let you map the columns yourself. No AI.",
  },
  {
    id:          "gc",
    icon:        <FileUp className="h-5 w-5" />,
    label:       "GameChanger CSV",
    description: "Export your stats from the GameChanger app and upload the .csv file.",
  },
];

// ─── View: method picker ──────────────────────────────────────────────────────

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

// ─── Main wizard modal ────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function CreateTeamWizardModal({ open, onOpenChange }: Props) {
  // "pick" → show method picker; "manual" → show form inline
  const [view, setView] = useState<"pick" | "manual">("pick");

  // Sub-modals (opened after wizard closes)
  const [aiOpen,       setAiOpen]       = useState(false);
  const [aiKey,        setAiKey]        = useState(0);
  const [gcOpen,       setGcOpen]       = useState(false);
  const [gcKey,        setGcKey]        = useState(0);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [sheetKey,     setSheetKey]     = useState(0);

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

  const isManual = view === "manual";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            {isManual ? (
              <>
                <DialogTitle>Create a team</DialogTitle>
                <DialogDescription>
                  Fill in the basics. You can update any of these details later.
                </DialogDescription>
              </>
            ) : (
              <>
                <DialogTitle>Create a team</DialogTitle>
                <DialogDescription>
                  Choose how you&apos;d like to set up your new team.
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          <DialogBody>
            {view === "pick" && <MethodPicker onPick={handlePick} />}

            {view === "manual" && (
              <>
                <button
                  type="button"
                  onClick={() => setView("pick")}
                  className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Choose a different method
                </button>
                <CreateTeamForm
                  onSuccess={() => handleOpenChange(false)}
                  onCancel={() => setView("pick")}
                />
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Sub-modals: opened after wizard closes */}
      <AiImportModal
        key={`ai-${aiKey}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
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
      />
    </>
  );
}
