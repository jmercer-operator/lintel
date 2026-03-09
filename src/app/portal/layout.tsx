import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Home — LINTEL",
  description: "Track your home's progress",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
