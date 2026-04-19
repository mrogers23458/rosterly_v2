import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

// Chat page needs the full remaining height so the message list and composer
// sit properly. We let the shell handle the sidebar/header, then let the chat
// page fill all remaining vertical space.
export default function TeamChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthenticatedShell>
      {/* stretch to remaining viewport height */}
      <div className="flex h-[calc(100vh-3.5rem)] flex-col md:h-screen">
        {children}
      </div>
    </AuthenticatedShell>
  );
}
