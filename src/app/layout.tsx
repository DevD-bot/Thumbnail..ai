import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thumbnail.AI — AI Gaming Thumbnail Generator",
  description:
    "Generate stunning gaming thumbnails using AI. Describe your vision or upload an image, and let the AI agent create professional CS2, Valorant, and YouTube thumbnails.",
  keywords: ["gaming thumbnail", "AI thumbnail generator", "CS2", "Valorant", "YouTube thumbnail", "AI image generation"],
  openGraph: {
    title: "Thumbnail.AI",
    description: "AI-powered gaming thumbnail generator",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
