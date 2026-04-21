import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
