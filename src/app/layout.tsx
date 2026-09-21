import type { Metadata, Viewport } from "next";
// Self-hosted Geist: `next/font/google` made every build depend on a live
// fonts.googleapis.com fetch, which fails the CI build when the network blips.
// The `geist` package ships the same fonts locally.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
