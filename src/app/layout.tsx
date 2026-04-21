import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rosterly",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/rosterly_logo_cropped.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1d63dc",
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
