import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reading KG",
  description: "Track your reading progress",
  manifest: "/reading-kg-pwa/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Reading KG",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/reading-kg-pwa/icon-192.png" />
      </head>
      <body>
        <AuthProvider>
          <PwaInstallPrompt />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
