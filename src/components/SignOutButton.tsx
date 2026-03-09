"use client";

import { signOut } from "@/lib/auth/actions";
import { useState } from "react";

interface SignOutButtonProps {
  variant?: "sidebar" | "topbar" | "minimal";
  className?: string;
}

export function SignOutButton({
  variant = "sidebar",
  className = "",
}: SignOutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
    } catch {
      setLoading(false);
    }
  }

  if (variant === "minimal") {
    return (
      <button
        onClick={handleSignOut}
        disabled={loading}
        className={`text-sm text-secondary hover:text-error transition-colors cursor-pointer ${className}`}
      >
        {loading ? "Signing out..." : "Sign Out"}
      </button>
    );
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-secondary hover:text-error hover:bg-red-50 rounded-[var(--radius-input)] transition-colors cursor-pointer ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
