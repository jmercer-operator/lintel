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

## Checkpoint 4 — Contacts & Agents (CURRENT)

### Database — ALREADY CREATED (do NOT run SQL again)
Tables: `agents`, `contacts`, `contact_stock`, `agent_projects`
All have RLS enabled with permissive policies for preview.
Stock table now has `agent_id` FK to agents.

### Contact Classification
- **Prospect**: Pre-exchange buyer (interested, EOI, browsing)
- **Customer**: Exchanged or settled buyer (committed)
- Auto-classify based on linked stock status: if any linked stock is "Exchanged", "Under Contract", or "Settled" → customer
- Manual override allowed

### What To Build

1. **Data access layer** additions:
   - `src/lib/data/agents.ts` — getAgents(), getAgent(id), createAgent(), updateAgent(), getAgentStats(id)
   - `src/lib/data/contacts.ts` — getContacts(), getContact(id), createContact(), updateContact(), getContactsByTag(), getContactsForMailGroup()
   - Server actions for create/update agents and contacts

2. **Contacts page** (`/contacts`) — add to SALES section in sidebar:
   - Tab bar: All | Prospects | Customers
   - Contact list/table with columns: Name, Email, Phone, Classification (badge), Source, Linked Lots, Tags, Added
   - Classification badges: Prospect (gold #D4A855), Customer (emerald #1A9E6F)
   - Search bar (filter by name, email, phone)
   - "Add Contact" button → modal
   - Click row → contact detail page

3. **Contact detail page** (`/contacts/[id]`):
   - Full profile card with all personal details
   - ID verification section (type, number, expiry, country)
   - Address section
   - Employment section
   - Solicitor section
   - Linked lots section (which stock items they're attached to, with status)
   - Source & attribution
   - Communication preferences & marketing consent toggle
   - Tags (editable, add/remove)
   - Notes
   - Activity timeline (future — placeholder for now)
   - Edit button → opens edit modal with all fields

4. **Add/Edit Contact modal**:
   - Tabbed form: Personal | Address | ID & Employment | Legal | Preferences
   - Personal: first name, last name, preferred name, email, phone, secondary phone, DOB, nationality, country of residence
   - Address: residential address fields + "postal address different?" toggle
   - ID & Employment: id type dropdown, id number, id expiry, id country, employer, occupation, company
   - Legal: solicitor name, firm, email, phone
   - Preferences: preferred contact method, marketing consent checkbox, source dropdown, referring agent dropdown, tags input
   - Form validation (first name + last name required, email format if provided)
   - Classification dropdown (prospect/customer)

5. **Agents page** (`/agents`) — replace placeholder:
   - Agent cards or table: Name, Company, Phone, License, Status (active/inactive), Assigned Projects, Lots Sold
   - "Add Agent" button → modal
   - Click → agent detail page

6. **Agent detail page** (`/agents/[id]`):
   - Profile card (name, company, email, phone, license)
   - Commission info
   - Assigned projects list
   - Stock assigned to this agent (table)
   - Performance summary: total lots, by status, total value
   - Edit button

7. **Add/Edit Agent modal**:
   - Fields: first name, last name, preferred name, email, phone, secondary phone, company, agency, license number, license expiry, commission type (% or flat), commission rate, status, notes
   - Assign to projects (multi-select checkboxes)

8. **Mail Group Builder** (`/contacts/groups` or section on contacts page):
   - Filter contacts by: project, classification, tags, source, marketing consent
   - Show count of matching contacts
   - "Export Email List" button (CSV download with name + email)
   - Preview list of matching contacts

9. **Sidebar navigation updates**:
   - SALES section: Stock, Pipeline, **Contacts**
   - MANAGEMENT section: **Agents**, Documents, Reports

10. **Bottom tabs update**:
    - Replace current tabs or add Contacts to quick access

### IMPORTANT:
- Contacts linked to stock with status "Exchanged", "Under Contract", or "Settled" should show as "Customer"
- Contacts with only "Available" or "EOI" linked stock (or no linked stock) show as "Prospect"
- The classification stored in DB can be manually set, but the UI should show a computed classification too
- Tags are TEXT[] in Postgres — use array operations
- Agent dropdown in stock forms should now pull from real agents table
- Keep all existing pages working (dashboard, projects, stock)
- Build passes with zero errors
- Commit message: "checkpoint 4: contacts & agents"
- Push to main

## Checkpoint 5a — Documents & Role System (CURRENT)

### Database — ALREADY CREATED (do NOT run SQL again)
Tables: `user_profiles`, `document_categories`, `project_documents`, `client_documents`, `project_milestones`
Storage buckets: `project-documents`, `client-documents` (both private, 50MB limit)
Seed data: 5 document categories, 7 milestones for Crossley & Bourke, 4 user profiles (1 staff, 3 agents)

### Three User Roles
1. **Staff** (role='staff') — Full access. Create projects, upload documents, add agents, full reports.
2. **Agent** (role='agent') — Add clients, change lot status, download project docs, upload client docs. Cannot add projects or agents.
3. **Client** (role='client') — View their development, download their contract, see progress milestones, see their agent. Fun, visual experience.

### What To Build

1. **Data access layer** additions:
   - `src/lib/data/documents.ts` — getProjectDocuments(projectId), getDocumentCategories(orgId), uploadProjectDocument(), deleteProjectDocument(), getClientDocuments(contactId)
   - `src/lib/data/milestones.ts` — getProjectMilestones(projectId), updateMilestone()
   - `src/lib/data/users.ts` — getUserProfile(email), getUserRole()
   - Server actions for document upload/delete, milestone updates

2. **Project detail page — Documents tab**:
   - Add a tab bar to project detail: "Stock" | "Documents" | "Milestones"
   - Documents tab shows documents grouped by category
   - Each category section: category name, list of documents (name, file size, date, download button)
   - "Upload Document" button per category (opens file picker)
   - "Add Category" button to create custom categories
   - Upload to Supabase Storage bucket `project-documents` with path: `{org_id}/{project_id}/{category_id}/{filename}`
   - Visibility badge on each doc (Staff Only / Agents / Everyone)
   - Delete button (staff only)

3. **Project detail page — Milestones tab**:
   - Visual milestone/progress bar showing construction stages
   - Each milestone: name, status (completed ✓ / in progress ◉ / upcoming ○), target date
   - Completed milestones: emerald with checkmark
   - In progress: pulsing/animated emerald dot
   - Upcoming: grey outline
   - Progress percentage calculated from completed/total
   - Staff can edit milestone status and dates (inline or modal)

4. **Role-based UI helpers**:
   - Create `src/lib/auth/roles.ts` with role checking utilities
   - `getCurrentUserRole()` — for now, return 'staff' as default (preview mode)
   - `canCreateProject(role)`, `canUploadDocument(role)`, `canAddAgent(role)`, `canChangeStatus(role)`, etc.
   - Components conditionally show/hide based on role
   - Don't implement actual auth yet — just the permission framework

5. **Client document upload** (on contact detail page):
   - Add "Documents" section to contact detail
   - Upload client documents: Signed Contract, ID Document, Proof of Funds, Solicitor Letter, Deposit Receipt, Other
   - Upload to `client-documents` bucket with path: `{org_id}/{contact_id}/{type}/{filename}`
   - Download + delete buttons

6. **Navigation update**:
   - Add "Documents" to sidebar under MANAGEMENT (links to a documents overview page)

7. **Documents overview page** (`/documents`):
   - Replace placeholder
   - Shows all projects with document counts per category
   - Quick upload from here too
   - Filter by project

### IMPORTANT:
- File uploads use Supabase Storage client
- All documents are PRIVATE (not public URLs) — use signed URLs for downloads
- Visibility levels: 'staff' (admin only), 'agent' (staff + agents can see), 'client' (everyone including clients)
- Default visibility for project documents: 'agent' (agents can download)
- Default visibility for client documents: 'staff' (only staff see client docs)
- Max file size: 50MB
- Keep all existing pages working
- Build passes with zero errors
- Commit message: "checkpoint 5a: documents & role system"
- Push to main
