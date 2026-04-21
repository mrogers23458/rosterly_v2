import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rosterly",
    short_name: "Rosterly",
    description:
      "Keep rosters, lineups, availability, and simple stats in one calm place for volunteer coaches and parents.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d63dc",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/rosterly_logo_cropped.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
