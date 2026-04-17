"use client";

import { CalendarDays, ClipboardList, Cloud, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { WidgetId } from "@/components/dashboard/dashboard-grid";

export const WIDGET_REGISTRY: {
  id: WidgetId;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id:          "upcoming-games",
    label:       "Upcoming Games",
    description: "Next scheduled game lineups with dates",
    icon:        <CalendarDays className="h-4 w-4" />,
  },
  {
    id:          "weather",
    label:       "Local Weather",
    description: "Current conditions for your location",
    icon:        <Cloud className="h-4 w-4" />,
  },
  {
    id:          "ai-setup",
    label:       "Set up with AI",
    description: "Import a team, roster, or lineup using AI",
    icon:        <Sparkles className="h-4 w-4" />,
  },
  {
    id:          "manual-setup",
    label:       "Set up manually",
    description: "Create a team from scratch step by step",
    icon:        <ClipboardList className="h-4 w-4" />,
  },
];

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  visibleIds: WidgetId[];
  onToggle: (id: WidgetId, visible: boolean) => void;
};

export function WidgetManagerModal({ open, onOpenChange, visibleIds, onToggle }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage widgets</DialogTitle>
          <DialogDescription>
            Check or uncheck widgets to show or hide them on your dashboard.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-2">
            {WIDGET_REGISTRY.map((w) => {
              const checked = visibleIds.includes(w.id);
              return (
                <label
                  key={w.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card hover:border-border/80",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onToggle(w.id, e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className={cn("flex items-center gap-2 text-sm font-medium", checked ? "text-primary" : "text-muted-foreground")}>
                    {w.icon}
                    {w.label}
                  </div>
                  <p className="ml-auto text-right text-xs text-muted-foreground">{w.description}</p>
                </label>
              );
            })}
          </div>
          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
