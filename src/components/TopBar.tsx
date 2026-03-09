"use client";

import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { RoleSwitcher } from "./RoleSwitcher";

interface TopBarProps {
  avatarName?: string;
}

export function TopBar({ avatarName = "AM" }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-5 sticky top-0 z-20">
      {/* Mobile: logo + hamburger */}
      <div className="lg:hidden flex items-center gap-3">
        <Logo size="sm" />
      </div>

      {/* Desktop: search placeholder */}
      <div className="hidden lg:flex items-center gap-2 flex-1">
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
            className="w-full pl-10 pr-16 py-2 text-sm rounded-[var(--radius-input)] border border-border bg-bg placeholder:text-muted focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none transition-colors"
            readOnly
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted font-mono bg-bg-alt border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Role Switcher */}
        <RoleSwitcher />
        {/* Mobile: hamburger menu */}
        <button className="lg:hidden p-2 rounded-[var(--radius-input)] hover:bg-bg-alt transition-colors text-secondary cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Notification bell */}
        <button className="p-2 rounded-[var(--radius-input)] hover:bg-bg-alt transition-colors text-secondary cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {/* Notification dot */}
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
        </button>

        {/* User avatar */}
        <Avatar name={avatarName} size="sm" />
      </div>
    </header>
  );
}
