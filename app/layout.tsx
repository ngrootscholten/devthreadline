import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";
import { UserMenu } from "./components/user-menu";
import { PendingNameHandler } from "./components/pending-name-handler";

export const metadata: Metadata = {
  title: "Threadline",
  description: "AI-powered code quality and convention tool with focused, parallel code checks. Standards that teach themselves.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-[#ededed] antialiased">
        <Providers>
          <PendingNameHandler />
          <nav className="border-b border-slate-800/50 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
                  Threadline
                </Link>
                <div className="flex items-center gap-6">
                  <Link href="/product" className="text-slate-300 hover:text-white transition-colors">
                    How It Works
                  </Link>
                  <UserMenu />
                </div>
              </div>
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
