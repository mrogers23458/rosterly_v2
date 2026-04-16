"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTeam } from "@/app/actions/teams";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import type { Team } from "@/lib/constants/teams";

type DeleteTeamModalProps = {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteTeamModal({ team, open, onOpenChange }: DeleteTeamModalProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameMatches = confirmation === team.name;

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setConfirmation("");
      setError(null);
    }
    onOpenChange(isOpen);
  }

  function handleDelete() {
    if (!nameMatches) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTeam(team.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete team permanently?</DialogTitle>
          <DialogDescription>
            This cannot be undone. All data associated with this team will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            You are about to permanently delete{" "}
            <span className="font-semibold">{team.name}</span>.
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-name">
              Type <span className="font-semibold">{team.name}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={team.name}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="flex-1"
              disabled={!nameMatches || isPending}
              onClick={handleDelete}
            >
              {isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
