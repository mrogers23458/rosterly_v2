"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteLineup } from "@/app/actions/lineups";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogBody, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameLineup } from "@/lib/constants/teams";

type Props = { lineup: GameLineup; open: boolean; onOpenChange: (v: boolean) => void };

export function DeleteLineupModal({ lineup, open, onOpenChange }: Props) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError]               = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();
  const nameMatches = confirmation === lineup.name;

  function handleClose(v: boolean) {
    if (!v) { setConfirmation(""); setError(null); }
    onOpenChange(v);
  }

  function handleDelete() {
    if (!nameMatches) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLineup(lineup.id, lineup.team_id);
      if (result.error) { setError(result.error); return; }
      router.refresh();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete lineup permanently?</DialogTitle>
          <DialogDescription>
            This will permanently remove the lineup and all its entries.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            You are about to permanently delete{" "}
            <span className="font-semibold">{lineup.name}</span>.
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-lineup-name">
              Type <span className="font-semibold">{lineup.name}</span> to confirm
            </Label>
            <Input id="confirm-lineup-name" value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={lineup.name} autoComplete="off" />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" size="lg" className="flex-1"
              onClick={() => handleClose(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="lg" className="flex-1"
              disabled={!nameMatches || isPending} onClick={handleDelete}>
              {isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
