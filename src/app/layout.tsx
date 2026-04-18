import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppProviders } from "@/components/providers/app-providers";
import { InviteHashHandler } from "@/components/invite-hash-handler";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rosterly — Youth baseball team organizer",
  description:
    "Keep rosters, lineups, availability, and simple stats in one calm place for volunteer coaches and parents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AppProviders>
          <InviteHashHandler />
          {children}
        </AppProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
