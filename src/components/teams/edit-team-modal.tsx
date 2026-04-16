"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { updateTeam, type TeamFormState } from "@/app/actions/teams";
import { TeamFormFields } from "@/components/teams/team-form-fields";
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
import type { Team } from "@/lib/constants/teams";

const initialState: TeamFormState = {};

type EditTeamModalProps = {
  team: Team;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditTeamModal({ team, open, onOpenChange }: EditTeamModalProps) {
  const router = useRouter();
  const boundAction = updateTeam.bind(null, team.id);
  const [state, action, pending] = useActionState(boundAction, initialState);
  // Key forces the form to remount (and reset) when the modal reopens for a different team
  const [formKey, setFormKey] = useState(team.id);

  useEffect(() => {
    if (open) setFormKey(team.id + Date.now());
  }, [open, team.id]);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onOpenChange(false);
    }
  }, [state.success, onOpenChange, router]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit team</DialogTitle>
          <DialogDescription>
            Update the details for <span className="font-medium text-foreground">{team.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form key={formKey} action={action} noValidate className="flex flex-col gap-5">
            {state.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <TeamFormFields defaults={team} />

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={pending} className="flex-1">
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
