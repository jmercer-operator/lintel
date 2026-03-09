"use client";

import { Card } from "@/components/Card";
import { Logo } from "@/components/Logo";
import { RoleSwitcher } from "@/components/RoleSwitcher";

export default function ClientPortalPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center">
        <Logo size="lg" />
        <h1 className="text-xl font-bold text-heading mt-4">Client Portal</h1>
        <p className="text-secondary text-sm mt-2">
          Coming in Checkpoint 5c
        </p>
        <div className="mt-6 flex justify-center">
          <RoleSwitcher />
        </div>
      </Card>
    </div>
  );
}
