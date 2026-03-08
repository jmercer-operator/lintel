"use client";

import { Logo } from "./Logo";
import { Avatar } from "./Avatar";

export function TopBar() {
  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-5 sticky top-0 z-20">
      {/* Mobile logo */}
      <div className="md:hidden">
        <Logo size="sm" />
      </div>

      {/* Desktop: search placeholder */}
      <div className="hidden md:flex items-center gap-2 flex-1">
        <div className="relative max-w-md w-full">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search projects, stock, agents..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-bg placeholder:text-muted focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell placeholder */}
        <button className="p-2 rounded-[var(--radius-input)] hover:bg-bg-alt transition-colors text-secondary cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        <Avatar name="Alex A" size="sm" />
      </div>
    </header>
  );
}
