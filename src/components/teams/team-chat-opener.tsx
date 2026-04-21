"use client";

import { MessageSquare } from "lucide-react";
import { useChatFlyout } from "@/components/chat/chat-flyout-context";
import { cn } from "@/lib/utils";

type Props = {
  teamId:     string;
  teamName:   string;
  className?: string;
};

export function TeamChatOpener({ teamId, teamName, className }: Props) {
  const { openTeamChat, setOpen } = useChatFlyout();

  return (
    <button
      type="button"
      onClick={() => {
        openTeamChat(teamId, teamName);
        setOpen(true);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted",
        className,
      )}
    >
      <MessageSquare className="h-4 w-4" />
      Team Chat
    </button>
  );
}
