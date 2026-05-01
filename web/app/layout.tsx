import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { NavSidebar } from "@/components/nav-sidebar";
import { TopBar } from "@/components/top-bar";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dialog Regression Harness",
  description:
    "A sketch of how to regression-test non-deterministic AI patient dialog for an InvolveXR-style platform.",
  metadataBase: new URL("https://involvexr-dialog-harness.vercel.app"),
  openGraph: {
    title: "Dialog Regression Harness",
    description:
      "Regression-testing non-deterministic AI patient dialog. Semantic assertions, consensus voting, multi-language coverage.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <NavSidebar />
            <div className="flex flex-1 flex-col min-w-0">
              <TopBar />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-[var(--border)] px-6 py-5 text-xs text-[var(--muted-foreground)] flex flex-wrap items-center justify-between gap-2">
                <span>
                  Dialog Regression Harness · Author Abdallah Safi · Built for a
                  conversation with Lumeto
                </span>
                <span className="font-mono">v0.2.0 · sketch</span>
              </footer>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
