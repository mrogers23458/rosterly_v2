"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { createTeam, type TeamFormState } from "@/app/actions/teams";
import { TeamFormFields } from "@/components/teams/team-form-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const initialState: TeamFormState = {};

type CreateTeamFormProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CreateTeamForm({ onSuccess, onCancel }: CreateTeamFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createTeam, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
      onSuccess?.();
    }
  }, [state.success, onSuccess, router]);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <TeamFormFields />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending} className="flex-1">
          {pending ? "Creating…" : "Create team"}
        </Button>
      </div>
    </form>
  );
}
