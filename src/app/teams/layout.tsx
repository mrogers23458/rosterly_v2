import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
