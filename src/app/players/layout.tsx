import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
