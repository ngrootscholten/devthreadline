import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navigation } from "./components/navigation";
import { Footer } from "./components/footer";
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
          <Navigation />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
