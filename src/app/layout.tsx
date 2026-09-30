import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { EventEngineProvider } from "@/lib/eventEngine";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "מערכת ניהול אירועים",
  description: "מערכת לניהול אישורי הגעה וסידורי הושבה לאירועים",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen" suppressHydrationWarning>
        <EventEngineProvider>{children}</EventEngineProvider>
      </body>
    </html>
  );
}
