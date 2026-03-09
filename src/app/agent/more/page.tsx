"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { RoleSwitcher } from "@/components/RoleSwitcher";

const links = [
  {
    label: "Documents",
    href: "/agent/documents",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/agent",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function AgentMorePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">More</h1>

      <Card padding="md">
        <div className="space-y-1">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 py-3 px-2 rounded-[var(--radius-button)] hover:bg-bg-alt transition-colors"
            >
              <span className="text-secondary">{link.icon}</span>
              <span className="text-sm font-medium text-heading">{link.label}</span>
              <svg className="ml-auto text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      </Card>

      {/* Mobile role switcher */}
      <Card padding="md">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Preview Mode</p>
        <RoleSwitcher />
      </Card>
    </div>
  );
}
