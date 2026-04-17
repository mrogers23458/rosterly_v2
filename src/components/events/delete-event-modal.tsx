"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEvent } from "@/app/actions/events";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { TeamEvent } from "@/lib/constants/events";

type Scope = "this" | "all";

type Props = {
  event:        TeamEvent;
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  redirectTo?:  string;
};

export function DeleteEventModal({ event, open, onOpenChange, redirectTo }: Props) {
  const router = useRouter();
  const isRecurring = Boolean(event.recurrence_group_id);
  const [scope, setScope]                     = useState<Scope>("this");
  const [submitError, setSubmitError]         = useState<string | null>(null);
  const [isPending,   startTransition]        = useTransition();

  function handleDelete() {
    startTransition(async () => {
      setSubmitError(null);
      const res = await deleteEvent(event.id, scope);
      if (res.error) {
        setSubmitError(res.error);
        return;
      }
      onOpenChange(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete event</DialogTitle>
          <DialogDescription>
            {scope === "all" && isRecurring
              ? `This will permanently delete all events in the "${event.title}" series. This cannot be undone.`
              : `This will permanently delete "${event.title}". This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {/* Scope selector for recurring events */}
          {isRecurring && (
            <div className="mb-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                This is a recurring event. Which events do you want to delete?
              </div>

              {(["this", "all"] as Scope[]).map((s) => (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    scope === s
                      ? "border-destructive bg-destructive/5"
                      : "border-border hover:border-destructive/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="delete-scope"
                    value={s}
                    checked={scope === s}
                    onChange={() => setScope(s)}
                    className="accent-destructive"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {s === "this" ? "Just this event" : "All events in this series"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s === "this"
                        ? "Only this occurrence will be deleted."
                        : "Every event in the series will be permanently deleted."}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {scope === "all" && isRecurring ? "Delete all events" : "Delete event"}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
