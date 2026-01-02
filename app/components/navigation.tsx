"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserMenu } from "./user-menu";

export function Navigation() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && session;

  return (
    <nav className="border-b border-slate-800/50 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
            Threadline
          </Link>
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
                <Link href="/threadlines" className="text-slate-300 hover:text-white transition-colors">
                  Threadlines
                </Link>
                <Link href="/docs/getting-started" className="text-slate-300 hover:text-white transition-colors">
                  Help
                </Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link href="/product" className="text-slate-300 hover:text-white transition-colors">
                  How It Works
                </Link>
                <UserMenu />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

