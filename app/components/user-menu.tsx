"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

function extractDisplayName(email: string | null | undefined): string {
  if (!email) return "Account";
  
  // Try to get part before first '.' (e.g., "john.doe@example.com" -> "john")
  const beforeDot = email.split('.')[0];
  if (beforeDot && beforeDot !== email) {
    return beforeDot.charAt(0).toUpperCase() + beforeDot.slice(1);
  }
  
  // If no '.', try part before '@' (e.g., "john@example.com" -> "john")
  const beforeAt = email.split('@')[0];
  if (beforeAt && beforeAt !== email) {
    return beforeAt.charAt(0).toUpperCase() + beforeAt.slice(1);
  }
  
  // Fallback to first character capitalized
  return email.charAt(0).toUpperCase() + email.slice(1);
}

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: '/' });
  };

  if (status === "loading") {
    return (
      <div className="text-slate-400 text-sm">
        Loading...
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/auth/signin"
          className="px-4 py-2 bg-green-400 text-black font-semibold rounded-lg hover:bg-green-500 transition-all"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="px-4 py-2 border border-slate-600 text-slate-300 font-semibold rounded-lg hover:border-slate-500 hover:text-white transition-all"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const displayName = extractDisplayName(session.user?.email);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
      >
        <Link
          href="/account"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="hover:text-white transition-colors"
        >
          {displayName}
        </Link>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-lg z-50">
          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setIsOpen(false)}
              className="block w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/account/settings"
              onClick={() => setIsOpen(false)}
              className="block w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

