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

## Checkpoint 5b — Agent Portal (CURRENT)

### Context
The role system and permission helpers exist in `src/lib/auth/roles.ts`. Currently `getCurrentUserRole()` returns 'staff'. We need an agent portal experience — a separate layout that agents see.

### What To Build

1. **Agent portal layout** at `src/app/(agent)/layout.tsx`:
   - Simpler sidebar than staff: only shows what agents can access
   - Agent sidebar sections:
     MY WORK: Dashboard, My Clients, My Lots
     PROJECTS: (list of assigned projects)
     RESOURCES: Documents
   - Same TopBar but with agent's name/avatar
   - Same BottomTabs but scoped: Dashboard, Clients, Lots, Docs, More
   - Agent-themed: same brand colours but slightly different accent to distinguish from staff view

2. **Agent Dashboard** (`src/app/(agent)/page.tsx`):
   - Welcome message: "Welcome back, {agent.first_name}"
   - 4 metric cards: My Active Lots, EOIs This Month, Under Contract, Commission (YTD)
   - Recent activity: their recent lot status changes and new clients
   - Quick actions: "Add Client", "Update Lot Status"

3. **My Clients page** (`src/app/(agent)/clients/page.tsx`):
   - List of contacts the agent has added/is referring
   - Add new client button → same contact form but scoped
   - Client cards with: name, linked lot, status, phone, email
   - Click → client detail (same contact detail page but in agent layout)

4. **My Lots page** (`src/app/(agent)/lots/page.tsx`):
   - All stock items assigned to this agent across all projects
   - Grouped by project
   - Quick status change: dropdown on each lot to change status (Available → EOI → Under Contract → Exchanged)
   - Agent CANNOT set status to "Settled" (that's staff only)

5. **Project Documents (agent view)** (`src/app/(agent)/documents/page.tsx`):
   - List assigned projects
   - Click project → see documents with visibility='agent' or 'client' (NOT 'staff')
   - Download buttons for each document
   - NO upload or delete for project docs (agent can only upload client docs)

6. **Agent project view** (`src/app/(agent)/projects/[id]/page.tsx`):
   - Project overview: name, address, stock summary
   - Stock table (only lots in this project)
   - Documents tab (agent-visible docs only)
   - Milestones tab (read-only view)

7. **Role switcher** (for preview/demo purposes):
   - Add a small toggle in the top bar that lets you switch between Staff / Agent / Client view
   - Stores in localStorage
   - `getCurrentUserRole()` reads from localStorage, defaults to 'staff'
   - This lets Alex preview all three experiences from one URL
   - Style: subtle pill toggle, not prominent

8. **Middleware update**:
   - When role is 'agent', redirect `/` to `/(agent)/` layout
   - When role is 'staff', redirect `/` to `/(dashboard)/` layout (current)
   - For now, the role switcher handles this client-side

### IMPORTANT:
- Agent portal is a SEPARATE layout group `(agent)` — do NOT modify existing `(dashboard)` layout
- Agent can change lot status but NOT to "Settled"
- Agent sees only their assigned projects and their own clients
- Agent CANNOT see other agents' clients
- For preview: use agent_id 'c0000000-0000-0000-0000-000000000001' (Sarah Mitchell) as default agent
- Keep all existing staff pages working
- Same brand colours, same components — just different navigation and scoped data
- Build passes with zero errors
- Commit message: "checkpoint 5b: agent portal"
- Push to main

## Checkpoint 5c — Client Portal (CURRENT)

### Context
This is the FUN portal. Clients (buyers) see a completely different experience — warm, visual, personal. Not a dashboard — more like a luxury property app. Think: "Your new home is being built. Here's how it's going."

### What To Build

1. **Client portal layout** at `src/app/portal/layout.tsx`:
   - NO sidebar. Clean, full-width layout.
   - Minimal top bar: LINTEL wordmark (small), client name, logout
   - No bottom tabs — this is a simple, focused experience
   - White background with generous spacing
   - Feels premium, not corporate

2. **Client home page** (`src/app/portal/page.tsx`):
   - **Hero section**: Large hero image placeholder (gradient placeholder with project name overlay for now, 400px tall on desktop, 250px mobile)
     - Project name in large white text overlaid on image
     - Address underneath in smaller white text
     - Subtle gradient overlay (dark at bottom for text readability)
   - **Welcome section**: 
     - "Welcome, {contact.preferred_name || contact.first_name}" in large warm text
     - Fun, engaging subtitle: "Your home at {project.name} is taking shape." or "Exciting things are happening at {project.name}."
     - Rotating/random warm messages from a curated list
   - **Milestone progress bar**:
     - Horizontal progress bar showing construction stages
     - Current stage highlighted with pulsing emerald dot
     - Completed stages: solid emerald with ✓
     - Upcoming: grey dots
     - Below bar: current stage name + description
     - "X of Y milestones complete" text
     - Progress percentage in large bold text
   - **Your lot summary card**:
     - Lot number, bedrooms, bathrooms, car spaces, internal/external area
     - Status badge (with fun wording: "Under Contract" → "Contracts exchanged — you're locked in! 🎉")
     - Price (if appropriate — maybe hide for clients? Staff decision later)
   - **Your agent card**:
     - Agent avatar (large circle with initials, emerald background)
     - Agent name, company
     - Phone (tap to call on mobile)
     - Email (tap to email)
     - Fun line: "Your dedicated agent" or "{agent.first_name} is here to help with anything you need."
   - **Documents section**:
     - Only documents with visibility='client' from their project
     - Plus their own client documents (signed contract, etc.)
     - Download buttons
     - Clean card layout, not a table
   - **Footer**: 
     - "© 2026 {org.name}. Powered by LINTEL."
     - Small LINTEL logo

3. **Fun wording library** (`src/lib/portal-messages.ts`):
   - Array of warm, engaging messages per milestone status:
     - Planning: "The blueprints are ready — your home is officially on the map!"
     - Demolition: "Out with the old! The site is being prepared for something amazing."
     - Foundation: "The foundation is going down — solid ground for your future home."
     - Frame: "The skeleton is rising! You'll start to see your home take shape."
     - Lock Up: "Walls are up, roof is on — it's starting to look like home!"
     - Fit Out: "The finishing touches are happening — kitchens, bathrooms, the works!"
     - Completion: "Almost there! Your new home is nearly ready for you. 🏠"
     - Complete: "Congratulations! Your home at {project} is complete! 🎉🏡"

4. **Client portal preview**:
   - For demo: use contact David Chen (d0000000-0000-0000-0000-000000000001), linked to Lot 202 at Crossley & Bourke
   - Role switcher "Client" button navigates to /portal

5. **Responsive design**:
   - Mobile-first: hero image smaller, cards stack, agent card full-width
   - Touch-friendly: large tap targets for phone/email
   - Feels like a native app on mobile

6. **Animations** (subtle):
   - Milestone progress bar animates on load (fills up to current progress)
   - Cards fade in on scroll (use CSS only, no heavy JS)
   - Pulsing dot on current milestone

### STYLE RULES (Client portal specific):
- MORE spacious than staff/agent views — lots of white space
- Larger text sizes for key info
- Rounded corners: 16px for cards (larger than staff view)
- Subtle warm shadows: 0 4px 12px rgba(0,0,0,0.06)
- Hero gradient: linear-gradient(to top, rgba(0,0,0,0.7), transparent)
- Status messages use emoji sparingly but effectively
- Font sizes: hero title 36px (mobile 28px), welcome 28px (mobile 22px), body 16px
- NO tables in client view — everything is cards
- Emerald #1A9E6F for progress/positive, Gold #D4A855 for highlights
- NO BLUE

### IMPORTANT:
- Client portal is at /portal — separate from /agent and /(dashboard)
- Client sees ONLY their project, their lot, their agent, their documents
- No pricing visible to clients (remove price from lot summary)
- No access to other clients, other lots, or admin features
- For demo, hardcode contact_id to David Chen until real auth is built
- Keep all existing staff and agent pages working perfectly
- Build passes with zero errors
- Commit message: "checkpoint 5c: client portal"
- Push to main

## Checkpoint 6 — Staff Feedback Refinements (CURRENT)

### Database — ALREADY UPDATED (do NOT run SQL again)
- contacts: added `buyer_type` ('owner_occupier'|'investor'), `firb_required` (boolean)
- contacts: source now includes 'direct_marketing' option
- client_documents: document_type now includes 'firb', removed 'proof_of_funds'
- agents: added address fields (address_line_1, address_line_2, suburb, state, postcode, country), logo_url
- projects: added logo_url, hero_render_url
- document_categories: added 'Project Logo' (sort 0) and 'Hero Render' (sort 3)
- Seed data updated: contacts have buyer_type, FIRB flagged for non-Australians

### 14 Changes to Implement

**1. Contact source — agent autocomplete + Direct Marketing:**
- Source field becomes a searchable dropdown
- Type a few letters → shows matching agents from agents table
- Or select "Direct Marketing" (no agent, no commission)
- When agent selected, auto-fill referring_agent_id
- When "Direct Marketing" selected, set referring_agent_id to null

**2. Buyer type on contact form:**
- New dropdown: "Owner Occupier" or "Investor"
- Required field when adding a contact
- Show as badge on contact cards/list (like classification badge)

**3. Remove "Proof of Funds" from client document types:**
- Document type options: Signed Contract, ID Document, Solicitor Letter, Deposit Receipt, FIRB, Other
- No "Proof of Funds"

**4. Shared client documents architecture:**
- Client documents uploaded for a contact should ALSO appear under the project's Documents tab
- On project Documents tab: add a "Client Documents" section showing all client docs for that project
- Upload from either location (contact detail OR project documents) — same underlying data

**5. FIRB instead of Country:**
- On contact card/detail: replace "Country of Residence" display with "FIRB Approval Required: Yes/No"
- Dropdown: Yes / No
- If Yes: show "FIRB" as an additional document type option in client documents
- If No: hide FIRB from document upload options
- Keep country_of_residence in DB but don't prominently display it

**6. Remove "Company" from employment section:**
- Contact form employment tab: remove company field
- Only show: Employer, Occupation

**7. Lot → Customer linking flow:**
- On stock table rows: when clicking a lot, show lot detail
- Add "Reserve" / "Link Customer" button on lot detail
- Clicking opens a modal with two options:
  A) "Add New Customer" → opens contact creation form, auto-links to this lot
  B) "Link Existing Customer" → searchable dropdown of existing contacts, select one → creates contact_stock link
- When customer is linked, lot status auto-changes to "EOI"
- Show linked customer name on the stock table row

**8. Auto-tags:**
- When buyer_type is set to "investor", auto-add tag "investor"
- When buyer_type is "owner_occupier", auto-add tag "owner-occupier"  
- When contact is linked to a project, auto-add tag with project slug (e.g. "crossley-bourke", "oak-and-high")
- Tags still editable manually, but these auto-populate

**9. Agent page — address + logo:**
- Agent detail page: show address fields
- Agent card/detail: show logo at top (if logo_url exists)
- Agent form: add address fields + logo upload

**10. Project logo next to project name:**
- Everywhere project name appears, show small project logo next to it (if logo_url exists)
- Dashboard project selector, project cards, project detail header, sidebar project lists
- Size: 24-32px inline with text, rounded corners

**11. Agent form — remove fields:**
- Remove "Company" field from add/edit agent form
- Remove "License Number" and "License Expiry" fields
- Keep: First Name, Last Name, Preferred Name, Email, Phone, Secondary Phone, Agency, Commission Type, Commission Rate, Status, Address fields, Logo, Notes

**12. Project documents — Project Logo category:**
- Under documents tab, show "Project Logo" as first category
- Single upload (replaces if new one uploaded)
- When uploaded, auto-set projects.logo_url to the file URL

**13. Hero Render + multiple renders:**
- "Hero Render" category: single primary render, auto-sets projects.hero_render_url
- "Renders" category: allow multiple file uploads (multi-select in file picker)
- Show as image thumbnails in the documents tab

**14. Multiple uploads for Marketing Collateral and Specifications:**
- These categories allow multiple files
- Multi-select file picker
- Show file count per category

### IMPORTANT:
- All changes apply to the STAFF view (src/app/(dashboard)/)
- Agent and client portal may need minor updates for consistency
- Keep all existing functionality working
- Auto-tags should not duplicate (check before adding)
- Logo/render thumbnails: use Supabase Storage signed URLs
- Build passes with zero errors
- Commit message: "checkpoint 6: staff feedback refinements"
- Push to main

## Checkpoint 7 — Agent Portal + Staff Fixes (CURRENT)

### Database — ALREADY UPDATED
- stock: added commission_rate (NUMERIC 5,2), commission_type ('percentage'|'flat')
- Seeded: all stock with agents gets 2.5% commission

### 12 Changes (Agent Portal + Staff)

**1. "My Active Lots" metric = unsold lots (Available + EOI only)**
- Count only lots with status 'Available' or 'EOI' assigned to this agent
- Drops off when status changes to 'Under Contract' or beyond

**2. Swap "Commission YTD" card → "All Lots"**
- Shows total number of ALL lots allocated to this agent (any status)

**3. Add "Settled" metric card to agent dashboard overview**
- 5 cards total: Active Lots, EOIs, Under Contract, Exchanged, Settled

**4. Lot status change needs explicit Save button**
- Currently status dropdown auto-saves — add a "Save" button next to dropdown
- Change only persists when Save is clicked
- Show confirmation feedback (green tick or toast)

**5. Add "Add Client" button on agent /clients page**
- Same contact form but scoped to agent context
- Auto-sets referring_agent_id to the current agent

**6. "Add Client" quick action on dashboard → opens form directly**
- Currently navigates to clients page — instead, open the add client modal/form directly
- After save, redirect to clients page

**7. PLATFORM-WIDE RULE: Cannot change lot status from Available unless linked to a customer**
- This applies to BOTH staff and agent views
- If lot has no linked contact (via contact_stock), status change is blocked
- Show message: "Link a customer before changing status"
- The Reserve flow (from CP6) handles this: Reserve → Link Customer → Status changes to EOI
- Exception: Staff can override this (add a "Force Status Change" option for staff only)

**8. Commission column on agent lots table**
- New column "Commission" next to Status in My Lots view
- Shows: "2.5%" or "$5,000" depending on commission_type
- Read-only for agents (greyed out / no edit)
- On STAFF side: commission_rate and commission_type editable in StockForm when allocating

**9. Project logo next to project names in agent portal**
- Same ProjectLogo component from staff view
- Apply to: agent sidebar project list, agent project detail, agent lots grouped headers

**10. Merge Docs/Documents tabs → single "Documents" entry**
- Remove duplicate navigation entry
- One "Documents" link in agent sidebar under RESOURCES
- Goes to the documents page

**11. Agent Profile page (/agent/profile)**
- Shows all agent details as onboarded (name, agency, commission, assigned projects, etc.)
- EDITABLE fields: email, phone, secondary phone, address (line1, line2, suburb, state, postcode)
- READ-ONLY fields: first name, last name, agency, commission rate/type, assigned projects
- Save button for editable fields
- Clean card layout matching brand

**12. Projects tab in agent sidebar + project pages**
- Add "Projects" to agent sidebar under MY WORK
- /agent/projects → grid of assigned project cards with logo, hero image, name, address, stock summary
- /agent/projects/[id] → project detail with:
  - Hero image at top (from hero_render_url)
  - Project name, address
  - Milestones timeline (read-only, visual progress bar)
  - Stock table for this project
  - Documents for this project (agent-visible)
- DELETE the standalone "Docs" tab from sidebar — documents now live inside each project page
- Agent bottom tabs: Dashboard, Clients, Lots, Projects, More

### STAFF SIDE CHANGES:
- StockForm: add commission_rate and commission_type fields (editable by staff)
- Stock table (staff): add Commission column
- Enforce "must link customer before status change" rule (with staff override)

### IMPORTANT:
- Agent portal files are in src/app/agent/ — update those
- Staff files in src/app/(dashboard)/ — update as needed
- Reuse existing components (ProjectLogo, StatusBadge, etc.)
- The customer-must-be-linked rule is THE key business rule — enforce it consistently
- Build passes with zero errors
- Commit message: "checkpoint 7: agent portal fixes + commission"
- Push to main
