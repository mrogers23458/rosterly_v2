"use client";

import { ArrowRight, FileImage, FileSpreadsheet, Sparkles } from "lucide-react";
import { useState } from "react";
import { AiImportModal } from "@/components/import/ai-import-modal";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: <FileSpreadsheet className="h-4 w-4" />,
    label: "Upload",
    detail: "CSV, photo, or screenshot",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    label: "AI extracts",
    detail: "Team, roster & players",
  },
  {
    icon: <FileImage className="h-4 w-4" />,
    label: "Review & import",
    detail: "Confirm before saving",
  },
];

export function AiSetupWidget() {
  const [open, setOpen] = useState(false);
  const [key,  setKey]  = useState(0);

  return (
    <>
      <div className="flex flex-col gap-5 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold leading-snug">Set up a team with AI</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Drop in any file — CSV export, photo of a lineup card, or a spreadsheet screenshot — and AI will extract your team, roster, and players automatically.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col gap-0.5 rounded-lg border border-primary/15 bg-background/70 px-3 py-2.5 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  {step.icon}
                  {step.label}
                </div>
                <p className="text-[11px] text-muted-foreground">{step.detail}</p>
              </div>
              {i < STEPS.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => { setKey((k) => k + 1); setOpen(true); }}
        >
          <Sparkles className="h-4 w-4" />
          Get started
        </Button>
      </div>

      <AiImportModal key={key} open={open} onOpenChange={setOpen} />
    </>
  );
}
