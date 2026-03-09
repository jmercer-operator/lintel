"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "MY WORK",
    items: [
      {
        label: "Dashboard",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
        href: "/agent",
      },
      {
        label: "My Clients",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
        href: "/agent/clients",
      },
      {
        label: "My Lots",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
        href: "/agent/lots",
      },
      {
        label: "Projects",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        ),
        href: "/agent/projects",
      },
    ],
  },
  {
    title: "RESOURCES",
    items: [
      {
        label: "Documents",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
        href: "/agent/documents",
      },
      {
        label: "Profile",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
        href: "/agent/profile",
      },
    ],
  },
];

export function AgentSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`
        hidden lg:flex flex-col
        h-screen bg-white border-r border-border
        transition-all duration-200 ease-in-out
        ${collapsed ? "w-16" : "w-[260px]"}
        fixed left-0 top-0 z-30
      `}
    >
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-5 h-16 border-b border-border`}>
        {!collapsed && <a href="/agent"><Logo size="md" /></a>}
        {collapsed && (
          <a href="/agent" className="text-xl font-extrabold text-emerald-primary select-none">L</a>
        )}
      </div>

      {/* Agent badge */}
      {!collapsed && (
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-primary" />
            <span className="text-xs font-semibold text-emerald-primary uppercase tracking-wider">Agent Portal</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/agent"
                    ? pathname === "/agent"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`
                      flex items-center gap-3 py-2.5
                      ${collapsed ? "justify-center px-2" : "px-3"}
                      rounded-[var(--radius-button)]
                      text-sm font-medium
                      transition-colors duration-150
                      min-h-[44px]
                      relative
                      ${
                        isActive
                          ? "bg-emerald-primary/8 text-emerald-primary border-l-[3px] border-l-emerald-primary"
                          : "text-secondary hover:bg-bg-alt hover:text-heading"
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle + Sign Out */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        {!collapsed && <SignOutButton />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            flex items-center gap-3 w-full py-2.5
            ${collapsed ? "justify-center px-2" : "px-3"}
            rounded-[var(--radius-button)]
            text-sm font-medium text-secondary
            hover:bg-bg-alt hover:text-heading
            transition-colors duration-150
            cursor-pointer min-h-[44px]
          `}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
