"use client";

import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { SignOutButton } from "@/components/SignOutButton";

export default function StaffProfilePage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-heading mb-6">Profile</h1>

      <Card padding="lg">
        <div className="flex items-center gap-4 mb-6">
          <Avatar name="AM" size="lg" />
          <div>
            <h2 className="text-lg font-bold text-heading">Staff Account</h2>
            <p className="text-sm text-secondary">Administrator</p>
          </div>
        </div>

        <div className="space-y-4">
          <ReadOnlyField label="Role" value="Staff" />
          <ReadOnlyField label="Email" value="info@mproperty.melbourne" />
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <SignOutButton />
        </div>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-heading block mb-1.5">
        {label}
      </label>
      <div className="px-3.5 py-2.5 rounded-[var(--radius-input)] bg-bg-alt border border-border text-sm text-secondary">
        {value || "—"}
      </div>
    </div>
  );
}
