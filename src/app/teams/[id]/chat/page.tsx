import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getUserTeamRole } from "@/lib/permissions";
import { ChatOpenRedirect } from "./chat-open-redirect";

type Props = { params: Promise<{ id: string }> };

/** Legacy URL: opens the messages flyout and returns to the team page. */
export default async function TeamChatPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: team } = await supabase.from("teams").select("id").eq("id", id).single();
  if (!team) notFound();

  const userRole = await getUserTeamRole(supabase, user.id, id);
  if (!userRole) notFound();

  return (
    <div className="flex min-h-[40vh] flex-col md:min-h-0">
      <ChatOpenRedirect teamId={id} />
    </div>
  );
}
