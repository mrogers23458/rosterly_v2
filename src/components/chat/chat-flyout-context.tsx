"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ChatFlyoutSelection =
  | { kind: "team"; teamId: string; title: string }
  | { kind: "direct"; userId: string; displayName: string }
  | null;

type ChatFlyoutContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  selection: ChatFlyoutSelection;
  openTeamChat: (teamId: string, title: string) => void;
  openDirectChat: (userId: string, displayName: string) => void;
  clearSelection: () => void;
};

const ChatFlyoutContext = createContext<ChatFlyoutContextValue | null>(null);

export function ChatFlyoutProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<ChatFlyoutSelection>(null);

  const openTeamChat = useCallback((teamId: string, title: string) => {
    setSelection({ kind: "team", teamId, title });
  }, []);

  const openDirectChat = useCallback((userId: string, displayName: string) => {
    setSelection({ kind: "direct", userId, displayName });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      selection,
      openTeamChat,
      openDirectChat,
      clearSelection,
    }),
    [open, selection, openTeamChat, openDirectChat, clearSelection],
  );

  return (
    <ChatFlyoutContext.Provider value={value}>{children}</ChatFlyoutContext.Provider>
  );
}

export function useChatFlyout() {
  const ctx = useContext(ChatFlyoutContext);
  if (!ctx) throw new Error("useChatFlyout must be used within ChatFlyoutProvider");
  return ctx;
}
