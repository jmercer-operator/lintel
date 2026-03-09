"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { type UserRole, getCurrentUserRole, setCurrentUserRole, isPreviewMode } from "@/lib/auth/roles";

const roles: { key: UserRole; label: string }[] = [
  { key: "staff", label: "Staff" },
  { key: "agent", label: "Agent" },
  { key: "client", label: "Client" },
];

export function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<UserRole>("staff");
  const [mounted, setMounted] = useState(false);
  const preview = isPreviewMode();

  useEffect(() => {
    setActive(getCurrentUserRole());
    setMounted(true);
  }, []);

  // Keep active in sync if pathname changes (e.g. navigated via sidebar)
  // Note: /agents is a STAFF page (agent list), /agent is the AGENT portal
  useEffect(() => {
    if (pathname === "/agent" || pathname.startsWith("/agent/")) {
      setActive("agent");
    } else if (pathname.startsWith("/portal")) {
      setActive("client");
    } else if (pathname === "/agents" || pathname.startsWith("/agents/") || pathname === "/" || pathname.startsWith("/projects") || pathname.startsWith("/stock") || pathname.startsWith("/contacts") || pathname.startsWith("/documents") || pathname.startsWith("/registrations") || pathname.startsWith("/more") || pathname.startsWith("/profile")) {
      setActive("staff");
    }
  }, [pathname]);

  function handleSwitch(role: UserRole) {
    if (role === active) return;
    setActive(role);
    setCurrentUserRole(role);

    switch (role) {
      case "agent":
        router.push("/agent");
        break;
      case "client":
        router.push("/portal");
        break;
      case "staff":
      default:
        router.push("/");
        break;
    }
  }

  // Only show in preview mode
  if (!mounted || !preview) return null;

  return (
    <div className="flex items-center bg-bg-alt rounded-full p-0.5 border border-border">
      {roles.map((r) => (
        <button
          key={r.key}
          onClick={() => handleSwitch(r.key)}
          className={`
            px-3 py-1 text-[11px] font-semibold rounded-full transition-all duration-200 cursor-pointer
            ${
              active === r.key
                ? "bg-emerald-primary text-white shadow-sm"
                : "text-secondary hover:text-heading"
            }
          `}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
