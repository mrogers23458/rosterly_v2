import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TeamChat } from "@/components/chat/team-chat";
import { getUserTeamRole } from "@/lib/permissions";
import type { TeamMessage } from "@/app/actions/messages";

type Props = { params: Promise<{ id: string }> };

export default async function TeamChatPage({ params }: Props) {
  const { id }     = await params;
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: team } = await supabase.from("teams").select("id, name").eq("id", id).single();
  if (!team) notFound();

  // Verify the current user is a member of this team
  const userRole = await getUserTeamRole(supabase, user.id, id);
  if (!userRole) notFound(); // not a member → 404 (security)

  // Load the most recent 100 messages
  const { data: msgRows } = await supabase
    .from("team_messages")
    .select("*")
    .eq("team_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  const messages = (msgRows ?? []) as TeamMessage[];

  // Display name for the current user (matches what sendTeamMessage derives)
  const currentUserName: string =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name     as string | undefined) ??
    user.email?.split("@")[0] ??
    "Unknown";

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 shadow-xs">
        <Link
          href={`/teams/${id}`}
          className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to team"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-sm font-semibold leading-tight">{team.name}</h1>
          <span className="text-[11px] text-muted-foreground">Team Chat</span>
        </div>
      </div>

      {/* ── Chat ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <TeamChat
          teamId={id}
          currentUserId={user.id}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
