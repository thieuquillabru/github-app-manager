import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  title: "App Manager",
  description: "Centralisez et accédez à toutes vos applications déployées.",
  manifest: '/github-app-manager/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/github-app-manager/favicon.ico', sizes: '48x48' },
      { url: '/github-app-manager/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/github-app-manager/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/github-app-manager/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "App Manager",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
