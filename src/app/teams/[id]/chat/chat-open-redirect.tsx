"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { getTeamNameForChat } from "@/app/actions/direct-messages";
import { useChatFlyout } from "@/components/chat/chat-flyout-context";

export function ChatOpenRedirect({ teamId }: { teamId: string }) {
  const router = useRouter();
  const { openTeamChat, setOpen } = useChatFlyout();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let cancelled = false;
    void (async () => {
      const { name, error } = await getTeamNameForChat(teamId);
      if (cancelled) return;
      openTeamChat(teamId, !error && name ? name : "Team");
      setOpen(true);
      router.replace(`/teams/${teamId}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId, router, openTeamChat, setOpen]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
      Opening messages…
    </div>
  );
}
