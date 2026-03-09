"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import type { Contact } from "@/lib/types";
import { updateClientProfile } from "./actions";

interface ProfileClientProps {
  contact: Contact;
}

export default function ProfileClient({ contact }: ProfileClientProps) {
  const displayName = contact.preferred_name || contact.first_name;

  // Editable fields
  const [email, setEmail] = useState(contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [addressLine1, setAddressLine1] = useState(
    contact.address_line_1 || ""
  );
  const [addressLine2, setAddressLine2] = useState(
    contact.address_line_2 || ""
  );
  const [suburb, setSuburb] = useState(
    contact.suburb || ""
  );
  const [state, setState] = useState(
    contact.state || ""
  );
  const [postcode, setPostcode] = useState(
    contact.postcode || ""
  );

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setFeedback(null);

    try {
      const result = await updateClientProfile(contact.id, {
        email: email.trim(),
        phone: phone.trim(),
        residential_address_line_1: addressLine1.trim(),
        residential_address_line_2: addressLine2.trim(),
        residential_suburb: suburb.trim(),
        residential_state: state.trim(),
        residential_postcode: postcode.trim(),
      });

      if (result.success) {
        setFeedback({ type: "success", message: "Profile updated successfully." });
      } else {
        setFeedback({
          type: "error",
          message: result.error || "Failed to update profile.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "An error occurred." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-5 h-14">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="text-sm text-secondary hover:text-emerald-primary transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/portal/profile"
              className="text-sm text-emerald-primary font-semibold"
            >
              Profile
            </Link>
            <RoleSwitcher />
            <SignOutButton variant="minimal" />
            <div className="w-8 h-8 rounded-full bg-emerald-primary flex items-center justify-center text-white text-xs font-semibold">
              {contact.first_name[0]}
              {contact.last_name[0]}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-8 sm:py-12 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-heading">Your Profile</h1>
          <p className="text-secondary text-sm mt-1">
            Manage your personal details.
          </p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`px-4 py-3 rounded-[var(--radius-input)] text-sm ${
              feedback.type === "success"
                ? "bg-emerald-primary/10 text-emerald-primary"
                : "bg-red-50 text-red-700"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Read-only card */}
        <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-semibold text-heading mb-4">
            Personal Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadOnlyField label="First Name" value={contact.first_name} />
            <ReadOnlyField label="Last Name" value={contact.last_name} />
            <ReadOnlyField
              label="Buyer Type"
              value={
                contact.buyer_type === "owner_occupier"
                  ? "Owner Occupier"
                  : contact.buyer_type === "investor"
                  ? "Investor"
                  : "—"
              }
            />
            <ReadOnlyField
              label="FIRB Required"
              value={
                contact.firb_required === true
                  ? "Yes"
                  : contact.firb_required === false
                  ? "No"
                  : "—"
              }
            />
          </div>
        </div>

        {/* Editable card */}
        <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-semibold text-heading mb-4">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 sm:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-semibold text-heading mb-4">
            Address
          </h2>
          <div className="space-y-4">
            <Input
              label="Address Line 1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street address"
            />
            <Input
              label="Address Line 2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Unit, suite, apt..."
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
              />
              <Input
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <Input
                label="Postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12">
        <div className="max-w-4xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} Powered by{" "}
            <span className="font-semibold">
              <span className="text-emerald-primary font-extrabold">L</span>
              <span className="text-body font-medium">INTEL</span>
            </span>
          </p>
          <Logo size="sm" />
        </div>
      </footer>
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
