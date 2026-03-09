"use client";

import { AgentSidebar } from "@/components/AgentSidebar";
import { TopBar } from "@/components/TopBar";
import { AgentBottomTabs } from "@/components/AgentBottomTabs";

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <AgentSidebar />
      <div className="lg:ml-[260px] transition-all duration-200">
        <TopBar avatarName="SM" />
        <main className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
      <AgentBottomTabs />
    </div>
  );
}
