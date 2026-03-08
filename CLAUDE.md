# LINTEL — Project Setup Instructions

## What This Is
Cloud-based CRM for property developers. Stock management, sales pipeline, agent portal.

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS 4
- Supabase (Auth + PostgreSQL + Storage)
- Deployment: Vercel

## Brand Design System

### Colours (Option B — Emerald)
- Primary: #1A9E6F (Emerald)
- Primary Light: #4DC89A
- Primary Dark: #147A56
- Accent: #D4A855 (Warm Gold)
- Charcoal: #1E2B26
- Neutrals: #FAFCFB (bg), #F0F5F2 (alt), #E2E8E4 (border), #B8C4BC (muted), #6B7A70 (secondary text), #2D3B32 (body text), #151E18 (headings)
- Success: #34B764, Warning: #E8A840, Error: #E05252, Info: #3BA3A3
- NO BLUE ANYWHERE

### Typography
- Font: Outfit (Google Fonts) — all weights 400-800
- Mono: JetBrains Mono (Google Fonts)
- Wordmark: LINTEL in Outfit Bold, letter-spacing: 0.08em, ALL CAPS always

### Logo
- Wordmark: Weighted L — "L" in ExtraBold #1A9E6F, "INTEL" in Medium #2D3B32
- Icon: Architectural L shape (for favicon)

### UI Style
- Border radius: 6px (inputs), 10px (cards), 14px (large cards)
- Shadows: subtle, warm-tinted
- Buttons: 8px radius, Outfit 600
- Generous spacing (Apple-like)
- Sidebar navigation on desktop, bottom tabs on mobile

### Tagline
"All projects. One view."

## Supabase Config
- Project URL: https://hfetavitxmvaqdkpniyf.supabase.co
- Keys will be in .env.local (not committed)

## What To Build (Checkpoint 1 — Foundation Only)
1. Scaffold Next.js 14+ with App Router + TypeScript
2. Install and configure Tailwind CSS with the brand design system tokens
3. Install @supabase/supabase-js, @supabase/ssr
4. Create the design system:
   - CSS custom properties for all colours
   - Tailwind config with brand colours, fonts, spacing
   - Button component (primary, secondary, ghost, accent, destructive)
   - Input component with labels
   - Card component with left accent border variant
   - Badge/status component
   - Avatar component
5. Create the layout:
   - Sidebar navigation (desktop — 260px wide, collapsible)
   - Bottom tab bar (mobile)
   - Top bar with LINTEL wordmark (Weighted L style), search placeholder, avatar
   - Responsive breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)
6. Create a login page:
   - LINTEL logo centered
   - "All projects. One view." tagline
   - Email + password inputs
   - "Sign In" button (primary emerald)
   - "Forgot password?" link
   - Clean, minimal, centered layout
   - Works on mobile and desktop
7. Create a placeholder dashboard page (behind auth):
   - Shows sidebar + topbar layout
   - 4 metric cards (Total Stock: 48, Available: 12, Under Contract: 28, Settled: 8)
   - Empty state for the stock table
8. Set up Supabase client utility (lib/supabase/client.ts and server.ts)
9. Set up middleware for auth protection
10. Create .env.local.example with required env vars

DO NOT:
- Create any database tables yet
- Implement actual auth logic (just the UI)
- Add any blue colours
- Use "lintel" in lowercase — always LINTEL

Use the latest stable versions of everything. Make it production-quality from the start.
