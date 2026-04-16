import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function LineupsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
