import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function PlayerDetailLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
