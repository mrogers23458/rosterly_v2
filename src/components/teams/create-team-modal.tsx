"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateTeamForm } from "@/app/teams/new/create-team-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "@/components/ui/dialog";

type Props = {
  /** When provided the modal is fully controlled — no trigger button is rendered. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
};

export function CreateTeamModal({ open: controlledOpen, onOpenChange }: Props = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = onOpenChange !== undefined;
  const open    = isControlled ? (controlledOpen ?? false) : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Create team
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            Fill in the basics. You can update any of these details later.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <CreateTeamForm
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
