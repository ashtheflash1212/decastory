import type { Metadata } from "next";
import { Alice, Nunito, Inter } from "next/font/google";
import "./globals.css";

const display = Alice({ subsets: ["latin"], variable: "--font-display", weight: ["400"] });
const mech = Nunito({ subsets: ["latin"], variable: "--font-mech", weight: ["500", "600", "700"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "Project DecaStory",
  description: "A finite, mechanical AI text adventure.",
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
