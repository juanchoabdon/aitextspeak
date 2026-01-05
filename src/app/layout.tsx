import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { TopLoader } from "@/components/ui/TopLoader";
import { AmplitudeProvider } from "@/components/analytics/AmplitudeProvider";
import { FirstPromoterScripts } from "@/components/analytics/FirstPromoter";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { FaviconSetter } from "@/components/FaviconSetter";
import { WelcomeToast } from "@/components/auth/WelcomeToast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com'),
  title: {
    default: "AI TextSpeak - AI Voice Generator for YouTubers & Content Creators",
    template: "%s | AI TextSpeak",
  },
  description: "The #1 AI voice generator for content creators. Create professional voiceovers for YouTube videos, audiobooks, podcasts, TikTok & more. Used by 50,000+ creators worldwide.",
  keywords: [
    // Creator-focused keywords
    "AI voice generator for YouTube",
    "YouTube voiceover generator",
    "text to speech for YouTubers",
    "AI narrator for audiobooks",
    "podcast voice generator",
    "TikTok voiceover AI",
    "content creator voice tools",
    "faceless YouTube channel voice",
    // Audiobook keywords
    "audiobook narrator AI",
    "AI audiobook creator",
    "self publish audiobook voice",
    "audiobook voice generator",
    // Podcast keywords  
    "podcast intro voice",
    "AI podcast narrator",
    // General TTS
    "AI text to speech",
    "realistic AI voices",
    "natural voice generator",
    "text to audio converter",
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
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon.svg", color: "#f59e0b" },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AI TextSpeak",
  },
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
        <FaviconSetter />
        <GoogleAnalytics />
        <FirstPromoterScripts />
        <Toaster 
          position="top-center" 
          richColors 
          theme="dark"
          toastOptions={{
            style: {
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f1f5f9',
            },
          }}
        />
        <Suspense fallback={null}>
          <WelcomeToast />
        </Suspense>
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
