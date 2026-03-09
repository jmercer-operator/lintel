"use client";

import { useState, useEffect, useRef } from "react";
import { getCurrentUserRole } from "@/lib/auth/roles";

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  type: "lot_assigned" | "lot_status" | "document" | "registration" | "general";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = getCurrentUserRole();
    fetch(`/api/notifications?role=${role}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
  }, [open]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const role = getCurrentUserRole();
    await fetch(`/api/notifications?role=${role}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const typeIcon: Record<string, string> = {
    lot_assigned: "🏠",
    lot_status: "📋",
    document: "📄",
    registration: "👤",
    general: "🔔",
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-bg-alt transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-secondary"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-heading">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-emerald-primary hover:underline cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-secondary">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border last:border-0 ${
                    n.read ? "opacity-60" : "bg-emerald-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading">{n.title}</p>
                      <p className="text-xs text-secondary mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-muted mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
