import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { TopLoader } from "@/components/ui/TopLoader";
import { AmplitudeProvider } from "@/components/analytics/AmplitudeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com'),
  title: {
    default: "AI TextSpeak - Professional AI Text to Speech Generator",
    template: "%s | AI TextSpeak",
  },
  description: "Transform your text into natural, human-like speech with AI TextSpeak. Create professional voiceovers for YouTube, audiobooks, podcasts, and more.",
  keywords: [
    "AI text to speech",
    "voice generator",
    "text to speech",
    "AI voiceover",
    "YouTube voiceover",
    "audiobook narrator",
    "podcast voice",
    "TTS",
  ],
  authors: [{ name: "AI TextSpeak" }],
  creator: "AI TextSpeak",
  publisher: "AI TextSpeak",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aitextspeak.com",
    siteName: "AI TextSpeak",
    title: "AI TextSpeak - Professional AI Text to Speech Generator",
    description: "Transform your text into natural, human-like speech with AI TextSpeak.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AI TextSpeak",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI TextSpeak - Professional AI Text to Speech Generator",
    description: "Transform your text into natural, human-like speech with AI TextSpeak.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f59e0b" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-white`}>
        <Suspense fallback={null}>
          <TopLoader />
        </Suspense>
        <Suspense fallback={null}>
          <AmplitudeProvider>
            {children}
          </AmplitudeProvider>
        </Suspense>
      </body>
    </html>
  );
}
