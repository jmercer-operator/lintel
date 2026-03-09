"use client";

import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { RoleSwitcher } from "./RoleSwitcher";
import { getCurrentUserRole, isPreviewMode } from "@/lib/auth/roles";

interface TopBarProps {
  avatarName?: string;
}

export function TopBar({ avatarName = "AM" }: TopBarProps) {
  const router = useRouter();

  function handleAvatarClick() {
    const role = getCurrentUserRole();
    const preview = isPreviewMode();
    if (preview) {
      switch (role) {
        case "agent":
          router.push("/agent/profile");
          break;
        case "client":
          router.push("/portal/profile");
          break;
        default:
          router.push("/profile");
      }
    } else {
      router.push("/profile");
    }
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-5 sticky top-0 z-20">
      {/* Mobile: logo — click goes to home based on role */}
      <div className="lg:hidden flex items-center gap-3">
        <a href={(() => { const r = getCurrentUserRole(); return r === 'agent' ? '/agent' : r === 'client' ? '/portal' : '/'; })()}><Logo size="sm" /></a>
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

        {/* User avatar — click goes to profile */}
        <a href={(() => { const r = getCurrentUserRole(); return r === 'agent' ? '/agent/profile' : r === 'client' ? '/portal/profile' : '/profile'; })()} className="cursor-pointer">
          <Avatar name={avatarName} size="sm" />
        </a>
      </div>
    </header>
  );
}
