import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { GlobalProviders } from "~/providers/global";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Indecode",
  description: "AI-Powered Code Reviews",
};

import { SpaceBackground } from "~/components/layout/space-background";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark scroll-smooth text-white">
      <body className={`${geistSans.variable} ${geistMono.variable} text-white min-h-screen relative`}>
        <SpaceBackground />
        <GlobalProviders>{children}</GlobalProviders>
      </body>
    </html>
  );
}
