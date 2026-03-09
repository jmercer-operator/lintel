"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { submitRegistration } from "@/lib/data/registrations";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agency, setAgency] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await submitRegistration({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        agency: agency.trim() || undefined,
        message: message.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <div className="bg-white rounded-[var(--radius-card-lg)] border border-border shadow-card p-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-heading mb-2">
              Registration Submitted
            </h2>
            <p className="text-secondary text-sm leading-relaxed">
              Your registration has been submitted. You&apos;ll receive an email
              once approved.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-block mt-6 text-sm text-emerald-primary hover:text-emerald-dark transition-colors font-medium"
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo + Tagline */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-secondary text-sm">Register as an Agent</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-[var(--radius-card-lg)] border border-border shadow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-[var(--radius-input)] px-4 py-3">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="First name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last Name"
                placeholder="Last name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="you@agency.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Phone"
              type="tel"
              placeholder="+61 400 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              label="Agency"
              placeholder="Your agency name"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="message"
                className="text-sm font-medium text-heading"
              >
                Tell us about yourself
              </label>
              <textarea
                id="message"
                rows={3}
                placeholder="Brief introduction or message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="
                  w-full px-3.5 py-2.5
                  rounded-[var(--radius-input)]
                  border border-border
                  bg-white text-body text-sm
                  placeholder:text-muted
                  transition-colors duration-150
                  hover:border-secondary
                  focus:border-emerald-primary focus:ring-1 focus:ring-emerald-primary focus:outline-none
                  resize-none
                "
              />
            </div>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                "Submit Registration"
              )}
            </Button>
          </form>
        </div>

        {/* Back to Login */}
        <div className="text-center mt-6">
          <Link
            href="/login"
            className="text-sm text-secondary hover:text-emerald-primary transition-colors"
          >
            Already have an account? Sign In
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-6">
          &copy; 2026 LINTEL. All rights reserved.
        </p>
      </div>
    </div>
  );
}
