import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ManualSetupWidget() {
  return (
    <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold leading-snug">Set up manually</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create your team from scratch — fill in the details yourself and build your roster one player at a time.
          </p>
        </div>
      </div>

      {/* Steps */}
      <ol className="flex flex-col gap-2">
        {[
          "Create a team",
          "Add a roster",
          "Add players one by one",
        ].map((step, i) => (
          <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {/* CTA */}
      <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
        <Link href="/teams/new">
          <Plus className="h-4 w-4" />
          Create team
        </Link>
      </Button>
    </div>
  );
}
