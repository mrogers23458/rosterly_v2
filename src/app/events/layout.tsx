import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
