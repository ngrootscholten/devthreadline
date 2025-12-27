"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <Link
        href="/auth/signin"
        className="px-4 py-2 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/account"
        className="text-slate-300 hover:text-white transition-colors"
      >
        {session.user?.email || "Account"}
      </Link>
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}

