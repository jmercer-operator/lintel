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

## Status Workflow (CONFIRMED)
Available → EOI → Under Contract → Exchanged → Settled
- NO "Reserved" status (merged into EOI)
- Status colours: Available=#1A9E6F, EOI=#D4A855, Under Contract=#7B3FA0, Exchanged=#E07858, Settled=#2D8C5A

## Stock Table Columns (CONFIRMED)
Lot | Bed | Bath | Car | m² Int | m² Ext | Price | Status | Agent | Updated
- NO "Type" column
- Bed/Bath/Car are integers, center-aligned
- m² Int/Ext are integers, right-aligned
- Lot and Price in JetBrains Mono

## Dashboard Overview Cards (CONFIRMED)
5 cards in a row (desktop), 2-col mobile, 3-col tablet:
Total Stock | Available | Under Contract | Exchanged | Settled

## What To Build (Checkpoint 1 — Foundation Only) [DONE]
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
- Add any blue colours
- Use "lintel" in lowercase — always LINTEL

Use the latest stable versions of everything. Make it production-quality from the start.

## Checkpoint 2 — Layout & Navigation [DONE]
Sidebar nav, bottom tabs, dashboard with metrics + stock table, projects page. All deployed.

## Checkpoint 3 — Projects & Stock (CURRENT)

### Supabase Database Setup
Create all tables via Supabase SQL Editor (use the Management API or a migration file).
Supabase URL: https://hfetavitxmvaqdkpniyf.supabase.co
Use the anon key from .env.local for client-side, service role for migrations.

### Database Schema

```sql
-- Organisations (multi-tenant)
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL DEFAULT 'AU',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  suburb TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'AU',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'archived')),
  total_lots INTEGER DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stock / Lots
CREATE TABLE stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  org_id UUID REFERENCES organisations(id) NOT NULL,
  lot_number TEXT NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  car_spaces INTEGER NOT NULL DEFAULT 0,
  internal_area NUMERIC(8,2),  -- m²
  external_area NUMERIC(8,2),  -- m²
  price NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'EOI', 'Under Contract', 'Exchanged', 'Settled')),
  level INTEGER,  -- floor/level number
  aspect TEXT,  -- N/S/E/W/NE etc
  agent_id UUID,
  agent_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, lot_number)
);

-- Enable RLS
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated + anon read (preview mode)
CREATE POLICY "Allow all read on organisations" ON organisations FOR SELECT USING (true);
CREATE POLICY "Allow all read on projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow all read on stock" ON stock FOR SELECT USING (true);
CREATE POLICY "Allow all insert on organisations" ON organisations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all insert on projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all insert on stock" ON stock FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on organisations" ON organisations FOR UPDATE USING (true);
CREATE POLICY "Allow all update on projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Allow all update on stock" ON stock FOR UPDATE USING (true);
```

### Seed Data
After creating tables, insert sample data:

```sql
-- Seed organisation
INSERT INTO organisations (id, name, slug, country) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'M Property Group', 'm-property', 'AU');

-- Seed projects
INSERT INTO projects (id, org_id, name, address, suburb, state, postcode, status, total_lots) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '6 Cross Street', '6 Cross Street', 'Footscray', 'VIC', '3011', 'active', 48),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '38-44 Hockley Ave', '38-44 Hockley Avenue', 'Mickleham', 'VIC', '3064', 'active', 24),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '67-69 Bell St', '67-69 Bell Street', 'Preston', 'VIC', '3072', 'active', 36),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '12 Duke St', '12 Duke Street', 'Sunshine', 'VIC', '3020', 'active', 18);

-- Seed stock for Cross Street
INSERT INTO stock (project_id, org_id, lot_number, bedrooms, bathrooms, car_spaces, internal_area, external_area, price, status, level, agent_name) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '101', 2, 2, 1, 78, 12, 485000, 'Available', 1, 'Sarah M.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '102', 1, 1, 1, 52, 8, 375000, 'EOI', 1, 'James T.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '103', 2, 1, 1, 65, 10, 425000, 'Available', 1, NULL),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '201', 3, 2, 2, 110, 18, 625000, 'EOI', 2, 'Sarah M.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '202', 2, 2, 1, 82, 10, 510000, 'Under Contract', 2, 'Priya K.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '203', 2, 1, 1, 68, 9, 445000, 'Under Contract', 2, 'James T.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '301', 3, 2, 2, 115, 22, 680000, 'Exchanged', 3, 'Priya K.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '302', 2, 2, 1, 78, 12, 495000, 'Settled', 3, 'Sarah M.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '303', 1, 1, 1, 50, 7, 365000, 'Available', 3, NULL),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '401', 3, 2, 2, 120, 25, 720000, 'Available', 4, NULL),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '402', 2, 2, 1, 85, 14, 530000, 'Settled', 4, 'James T.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '403', 2, 1, 1, 70, 11, 460000, 'EOI', 4, 'Priya K.');
```

### What To Build

1. **Run the SQL above** against Supabase to create tables and seed data.
   Use the Supabase client with the service role key, OR use `supabase` CLI, OR run via the dashboard SQL editor.
   Service role key can be retrieved by running:
   ```
   You may need to read it from the Supabase dashboard. For now, create a migration file at `supabase/migrations/001_initial_schema.sql` with all the SQL above.
   ```

2. **Create a data access layer** at `src/lib/data/`:
   - `projects.ts` — getProjects(), getProject(id), createProject(), updateProject()
   - `stock.ts` — getStock(projectId), getStockItem(id), createStock(), updateStock(), getStockStats(projectId)
   - All use Supabase server client

3. **Projects page** (`/projects`) — REPLACE current placeholder:
   - Fetch real projects from Supabase
   - Grid of project cards (1/2/3 col responsive)
   - Each card: name, address, status badge, stock summary bar (Available/EOI/Under Contract/Exchanged/Settled as colored segments)
   - Click card → goes to `/projects/[id]`

4. **Project detail page** (`/projects/[id]`):
   - Header: project name, address, status
   - Stock stats cards (same 5 as dashboard but for this project)
   - Full stock table with all columns (Lot, Bed, Bath, Car, m² Int, m² Ext, Price, Status, Agent, Updated)
   - Status filter dropdown (same as dashboard)
   - "Add Lot" button (opens a modal/sheet)
   - Click a lot row → opens detail/edit sheet

5. **Add/Edit Stock modal**:
   - Form with all fields: Lot Number, Bedrooms, Bathrooms, Car Spaces, Internal Area, External Area, Price, Status (dropdown), Level, Aspect, Agent, Notes
   - Save writes to Supabase
   - Form validation (lot number required, numeric fields)

6. **Dashboard page** — REPLACE hardcoded data:
   - Fetch real stats from Supabase (aggregate across all projects or selected project)
   - Project selector dropdown fetches real projects
   - Stock table shows real data from selected project
   - Recent activity section can stay as sample data for now

7. **Add a "New Project" button** on `/projects`:
   - Opens modal with fields: Name, Address, Suburb, State, Postcode
   - Creates project in Supabase with org_id hardcoded to the seed org

### IMPORTANT RULES:
- Use Server Components where possible, Client Components only when needed (interactivity)
- Format prices as AUD with $ and commas (e.g. $485,000)
- m² values as integers
- Status filter persists via URL search params
- All data fetching uses Supabase server client (no API routes needed)
- Keep all existing styling, colours, components
- Build passes with zero errors before committing
- Commit message: "checkpoint 3: projects & stock with Supabase"
- Push to main (Vercel auto-deploys)
