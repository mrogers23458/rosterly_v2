import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
