import { PwaProvider } from "@/components/pwa/pwa-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <PwaProvider>{children}</PwaProvider>;
}
