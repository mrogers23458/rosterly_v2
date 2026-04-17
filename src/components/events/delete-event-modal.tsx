"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteEvent } from "@/app/actions/events";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent,
  DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { TeamEvent } from "@/lib/constants/events";
import { useState } from "react";

type Props = {
  event:        TeamEvent;
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  redirectTo?:  string;
};

export function DeleteEventModal({ event, open, onOpenChange, redirectTo }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  function handleDelete() {
    startTransition(async () => {
      setSubmitError(null);
      const res = await deleteEvent(event.id);
      if (res.error) {
        setSubmitError(res.error);
        return;
      }
      onOpenChange(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete event</DialogTitle>
          <DialogDescription>
            This will permanently delete &ldquo;{event.title}&rdquo;. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete event
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
