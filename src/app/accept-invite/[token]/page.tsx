import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { AcceptInviteClient } from "./accept-invite-client";
import type { TeamRole } from "@/lib/constants/roles";

type Props = { params: Promise<{ token: string }> };

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;

  // Check if user is signed in.
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login, then come back here after auth.
    redirect(`/login?next=/accept-invite/${token}`);
  }

  // Look up the invitation using the admin client (bypasses RLS).
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("pending_team_invitations")
    .select("id, team_id, email, role, accepted_at, expires_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return (
      <InvitePage>
        <div className="text-center">
          <h1 className="text-xl font-bold">Invitation not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This invitation link is invalid or has already been used.
          </p>
        </div>
      </InvitePage>
    );
  }

  if (invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return (
      <InvitePage>
        <div className="text-center">
          <h1 className="text-xl font-bold">Invitation expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {invite.accepted_at
              ? "This invitation has already been accepted."
              : "This invitation has expired. Ask the team owner to send a new one."}
          </p>
        </div>
      </InvitePage>
    );
  }

  // Fetch the team name to display.
  const { data: team } = await admin
    .from("teams")
    .select("name")
    .eq("id", invite.team_id)
    .single();

  return (
    <InvitePage>
      <AcceptInviteClient
        token={token}
        teamName={team?.name ?? "your team"}
        role={invite.role as TeamRole}
      />
    </InvitePage>
  );
}

function InvitePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
