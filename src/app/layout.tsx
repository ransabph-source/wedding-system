import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SyncErrorToast from "@/components/SyncErrorToast";
import { getCurrentUser } from "@/lib/auth";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // A database hiccup shouldn't take down public pages like guest check-in;
  // protected pages and API routes check access again themselves.
  const user = await getCurrentUser().catch((error: unknown) => {
    console.error(error);
    return null;
  });

  return (
    <html
      lang="he"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen" suppressHydrationWarning>
        <EventEngineProvider key={user?.id ?? "signed-out"} userRole={user?.role ?? null}>
          {children}
          <SyncErrorToast />
        </EventEngineProvider>
      </body>
    </html>
  );
}
