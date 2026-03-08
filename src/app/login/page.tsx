"use client";

import { Logo } from "@/components/Logo";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo + Tagline */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-secondary text-sm">
            All projects. One view.
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-[var(--radius-card-lg)] border border-border shadow-card p-8">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-5"
          >
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <Button type="submit" fullWidth>
              Sign In
            </Button>
          </form>

          <div className="mt-5 text-center">
            <a
              href="#"
              className="text-sm text-secondary hover:text-emerald-primary transition-colors"
            >
              Forgot password?
            </a>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-8">
          &copy; 2026 LINTEL. All rights reserved.
        </p>
      </div>
    </div>
  );
}
