import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getPendingInvitesForCurrentUser } from "@/app/actions/members";
import { AcceptInviteListClient, NoInvitesClient } from "./accept-invite-client";

export default async function AcceptInvitePage() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/accept-invite");
  }

  const { data: invites } = await getPendingInvitesForCurrentUser();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        {invites && invites.length > 0 ? (
          <AcceptInviteListClient invites={invites} />
        ) : (
          <NoInvitesClient />
        )}
      </div>
    </div>
  );
}
