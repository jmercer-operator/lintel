import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { BottomTabs } from "@/components/BottomTabs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="md:ml-[260px]">
        <TopBar />
        <main className="p-5 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
