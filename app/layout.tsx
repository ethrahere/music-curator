import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Curio - Share & Discover Music on Farcaster",
  description: "A music discovery app for Farcaster. Share tracks from YouTube, Spotify, SoundCloud, and more.",
  openGraph: {
    title: "Curio - Music Discovery on Farcaster",
    description: "Share tracks from YouTube, Spotify, SoundCloud, and more.",
    images: [
      {
        url: "https://music-curator.vercel.app/image-url.png",
        width: 1200,
        height: 630,
        alt: "Curio",
      },
    ],
  },
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://music-curator.vercel.app/image-url.png",
      button: {
        title: "Open Curio",
        action: {
          type: "launch",
          name: "Curio",
          url: "https://music-curator.vercel.app",
          splashImageUrl: "https://music-curator.vercel.app/image-url.png",
          splashBackgroundColor: "#0b1a12",
        },
      },
    }),
    "fc:frame": JSON.stringify({
      version: "1",
      imageUrl: "https://music-curator.vercel.app/image-url.png",
      button: {
        title: "Open Curio",
        action: {
          type: "launch",
          name: "Curio",
          url: "https://music-curator.vercel.app",
          splashImageUrl: "https://music-curator.vercel.app/image-url.png",
          splashBackgroundColor: "#0b1a12",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
