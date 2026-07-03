import type { Metadata } from "next";
import { Alice, Nunito, Inter } from "next/font/google";
import "./globals.css";

const display = Alice({ subsets: ["latin"], variable: "--font-display", weight: ["400"] });
const mech = Nunito({ subsets: ["latin"], variable: "--font-mech", weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600"] });

const DESCRIPTION = "A finite, mechanical AI choice-based story game. Every choice matters. Every story ends.";

export const metadata: Metadata = {
  title: "DecaStory",
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DecaStory",
  },
  icons: {
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "DecaStory",
    description: DESCRIPTION,
    url: "https://decastory.vercel.app",
    siteName: "DecaStory",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "DecaStory",
    description: DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#BFD8EC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${mech.variable} ${body.variable} bg-parchment text-ink font-body`}>
        {children}
      </body>
    </html>
  );
}
