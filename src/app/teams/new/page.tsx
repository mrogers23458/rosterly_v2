import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateTeamForm } from "./create-team-form";

export default function NewTeamPage() {
  return (
    <div className="max-w-xl px-4 py-8 sm:px-6 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link href="/teams">
          <ArrowLeft className="h-4 w-4" />
          Back to teams
        </Link>
      </Button>

      <h1 className="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">
        Create a team
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Fill in the basics. You can update any of these details later.
      </p>

      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <CreateTeamForm />
      </div>
    </div>
  );
}
