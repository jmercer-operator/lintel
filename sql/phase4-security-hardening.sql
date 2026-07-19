-- Phase 4: Security hardening - replace permissive preview RLS policies.
--
-- LOCAL REVIEW MIGRATION ONLY.
-- Do not apply to Supabase until the app is ready to run without preview
-- bypasses and the live deployment has been smoke-tested with real
-- staff, agent, and client accounts.
--
-- Policy model:
-- - Staff: full org-scoped access.
-- - Agents: assigned project/lot access, referred or linked clients, and
--   agent-visible/client-visible project documents.
-- - Clients: own profile, linked project/stock records, and client-visible
--   documents for their own purchase.
-- - Public anon: can only create pending agent registration requests.

-- -------------------------------------------------------------------------
-- Helper functions
-- -------------------------------------------------------------------------
-- SECURITY DEFINER is used to avoid recursive RLS checks when policies need
-- to inspect user_profiles, agents, contacts, stock, or contact_stock.
-- The fixed search_path prevents function hijacking through attacker-owned
-- schemas.

CREATE OR REPLACE FUNCTION public.lintel_current_staff_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT up.org_id
  FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid()
    AND up.role = 'staff'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id
  FROM public.agents a
  WHERE a.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.lintel_contact_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.id
  FROM public.contacts c
  WHERE c.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.lintel_is_staff_for_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_org_id IS NOT NULL
    AND public.lintel_current_staff_org_id() = target_org_id
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_in_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agents a
    WHERE a.id = public.lintel_agent_id()
      AND a.org_id = target_org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.lintel_contact_in_org(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contacts c
    WHERE c.id = public.lintel_contact_id()
      AND c.org_id = target_org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_assigned_project(target_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.agent_projects ap
        WHERE ap.agent_id = public.lintel_agent_id()
          AND ap.project_id = target_project_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.stock s
        WHERE s.agent_id = public.lintel_agent_id()
          AND s.project_id = target_project_id
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_owns_stock(target_stock_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stock s
    WHERE s.id = target_stock_id
      AND s.agent_id = public.lintel_agent_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_can_access_stock(target_stock_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stock s
    WHERE s.id = target_stock_id
      AND (
        s.agent_id = public.lintel_agent_id()
        OR public.lintel_agent_assigned_project(s.project_id)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.lintel_contact_linked_project(target_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contact_stock cs
    WHERE cs.contact_id = public.lintel_contact_id()
      AND cs.project_id = target_project_id
  )
$$;

CREATE OR REPLACE FUNCTION public.lintel_contact_linked_stock(target_stock_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contact_stock cs
    WHERE cs.contact_id = public.lintel_contact_id()
      AND cs.stock_id = target_stock_id
  )
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_can_access_contact(target_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_contact_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.contacts c
        WHERE c.id = target_contact_id
          AND c.referring_agent_id = public.lintel_agent_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public.contact_stock cs
        JOIN public.stock s ON s.id = cs.stock_id
        WHERE cs.contact_id = target_contact_id
          AND (
            s.agent_id = public.lintel_agent_id()
            OR public.lintel_agent_assigned_project(s.project_id)
          )
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.lintel_contact_can_access_contact(target_contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT target_contact_id IS NOT NULL
    AND target_contact_id = public.lintel_contact_id()
$$;

REVOKE ALL ON FUNCTION public.lintel_current_staff_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_agent_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_contact_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_is_staff_for_org(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_agent_in_org(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_contact_in_org(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_agent_assigned_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_agent_owns_stock(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_agent_can_access_stock(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_contact_linked_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_contact_linked_stock(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_agent_can_access_contact(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_contact_can_access_contact(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.lintel_current_staff_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_contact_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_is_staff_for_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_contact_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_assigned_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_owns_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_can_access_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_contact_linked_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_contact_linked_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_can_access_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_contact_can_access_contact(uuid) TO authenticated;

-- -------------------------------------------------------------------------
-- Drop all existing policies on covered tables.
-- -------------------------------------------------------------------------

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'organisations',
        'user_profiles',
        'projects',
        'stock',
        'agents',
        'agent_projects',
        'contacts',
        'contact_stock',
        'document_categories',
        'project_documents',
        'client_documents',
        'project_milestones',
        'agent_registrations',
        'notifications',
        'activities',
        'follow_ups',
        'buyer_interests',
        'document_shares',
        'email_templates'
      ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- Enable RLS on all covered tables.
-- -------------------------------------------------------------------------

ALTER TABLE IF EXISTS organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agent_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buyer_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- Organisations and profiles
-- -------------------------------------------------------------------------

CREATE POLICY lintel_organisations_staff_all ON organisations
  FOR ALL
  USING (public.lintel_is_staff_for_org(id))
  WITH CHECK (public.lintel_is_staff_for_org(id));

CREATE POLICY lintel_organisations_agent_client_select ON organisations
  FOR SELECT
  USING (
    public.lintel_agent_in_org(id)
    OR public.lintel_contact_in_org(id)
  );

CREATE POLICY lintel_user_profiles_staff_all ON user_profiles
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_user_profiles_self_select ON user_profiles
  FOR SELECT
  USING (auth_user_id = auth.uid());

-- -------------------------------------------------------------------------
-- Projects and stock
-- -------------------------------------------------------------------------

CREATE POLICY lintel_projects_staff_all ON projects
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_projects_agent_select ON projects
  FOR SELECT
  USING (public.lintel_agent_assigned_project(id));

CREATE POLICY lintel_projects_client_select ON projects
  FOR SELECT
  USING (public.lintel_contact_linked_project(id));

CREATE POLICY lintel_stock_staff_all ON stock
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_stock_agent_select ON stock
  FOR SELECT
  USING (
    public.lintel_agent_can_access_stock(id)
    OR public.lintel_agent_assigned_project(project_id)
  );

CREATE POLICY lintel_stock_client_select ON stock
  FOR SELECT
  USING (public.lintel_contact_linked_stock(id));

-- -------------------------------------------------------------------------
-- Agents and assignments
-- -------------------------------------------------------------------------

CREATE POLICY lintel_agents_staff_all ON agents
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_agents_self_select ON agents
  FOR SELECT
  USING (id = public.lintel_agent_id());

CREATE POLICY lintel_agents_self_update ON agents
  FOR UPDATE
  USING (id = public.lintel_agent_id())
  WITH CHECK (
    id = public.lintel_agent_id()
    AND public.lintel_agent_in_org(org_id)
  );

CREATE POLICY lintel_agents_client_select_linked ON agents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM stock s
      WHERE s.agent_id = agents.id
        AND public.lintel_contact_linked_stock(s.id)
    )
  );

CREATE POLICY lintel_agent_projects_staff_all ON agent_projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = agent_projects.project_id
        AND public.lintel_is_staff_for_org(p.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = agent_projects.project_id
        AND public.lintel_is_staff_for_org(p.org_id)
    )
  );

CREATE POLICY lintel_agent_projects_agent_select ON agent_projects
  FOR SELECT
  USING (agent_id = public.lintel_agent_id());

-- -------------------------------------------------------------------------
-- Contacts and stock links
-- -------------------------------------------------------------------------

CREATE POLICY lintel_contacts_staff_all ON contacts
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_contacts_agent_select ON contacts
  FOR SELECT
  USING (public.lintel_agent_can_access_contact(id));

CREATE POLICY lintel_contacts_agent_insert ON contacts
  FOR INSERT
  WITH CHECK (
    public.lintel_agent_in_org(org_id)
    AND referring_agent_id = public.lintel_agent_id()
  );

CREATE POLICY lintel_contacts_agent_update ON contacts
  FOR UPDATE
  USING (public.lintel_agent_can_access_contact(id))
  WITH CHECK (
    public.lintel_agent_in_org(org_id)
    AND (
      referring_agent_id = public.lintel_agent_id()
      OR public.lintel_agent_can_access_contact(id)
    )
  );

CREATE POLICY lintel_contacts_client_select ON contacts
  FOR SELECT
  USING (public.lintel_contact_can_access_contact(id));

CREATE POLICY lintel_contacts_client_update ON contacts
  FOR UPDATE
  USING (public.lintel_contact_can_access_contact(id))
  WITH CHECK (public.lintel_contact_can_access_contact(id));

CREATE POLICY lintel_contact_stock_staff_all ON contact_stock
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = contact_stock.project_id
        AND public.lintel_is_staff_for_org(p.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM projects p
      WHERE p.id = contact_stock.project_id
        AND public.lintel_is_staff_for_org(p.org_id)
    )
  );

CREATE POLICY lintel_contact_stock_agent_select ON contact_stock
  FOR SELECT
  USING (
    public.lintel_agent_can_access_stock(stock_id)
    OR public.lintel_agent_can_access_contact(contact_id)
  );

CREATE POLICY lintel_contact_stock_agent_insert ON contact_stock
  FOR INSERT
  WITH CHECK (
    public.lintel_agent_owns_stock(stock_id)
    AND public.lintel_agent_can_access_contact(contact_id)
  );

CREATE POLICY lintel_contact_stock_client_select ON contact_stock
  FOR SELECT
  USING (contact_id = public.lintel_contact_id());

-- -------------------------------------------------------------------------
-- Documents and milestones
-- -------------------------------------------------------------------------

CREATE POLICY lintel_document_categories_staff_all ON document_categories
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_document_categories_agent_select ON document_categories
  FOR SELECT
  USING (public.lintel_agent_in_org(org_id));

CREATE POLICY lintel_document_categories_client_select ON document_categories
  FOR SELECT
  USING (public.lintel_contact_in_org(org_id));

CREATE POLICY lintel_project_documents_staff_all ON project_documents
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_project_documents_agent_select ON project_documents
  FOR SELECT
  USING (
    visibility IN ('agent', 'client')
    AND public.lintel_agent_assigned_project(project_id)
  );

CREATE POLICY lintel_project_documents_client_select ON project_documents
  FOR SELECT
  USING (
    visibility = 'client'
    AND (
      public.lintel_contact_linked_project(project_id)
      OR EXISTS (
        SELECT 1
        FROM document_shares ds
        WHERE ds.document_type = 'project_document'
          AND ds.document_id = project_documents.id
          AND ds.shared_with_type = 'contact'
          AND ds.shared_with_id = public.lintel_contact_id()
      )
    )
  );

CREATE POLICY lintel_client_documents_staff_all ON client_documents
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_client_documents_agent_select ON client_documents
  FOR SELECT
  USING (
    visibility IN ('agent', 'client')
    AND public.lintel_agent_can_access_contact(contact_id)
  );

CREATE POLICY lintel_client_documents_agent_insert ON client_documents
  FOR INSERT
  WITH CHECK (
    public.lintel_agent_in_org(org_id)
    AND public.lintel_agent_can_access_contact(contact_id)
    AND visibility IN ('agent', 'client')
  );

CREATE POLICY lintel_client_documents_client_select ON client_documents
  FOR SELECT
  USING (
    contact_id = public.lintel_contact_id()
    AND visibility = 'client'
  );

CREATE POLICY lintel_project_milestones_staff_all ON project_milestones
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_project_milestones_agent_select ON project_milestones
  FOR SELECT
  USING (public.lintel_agent_assigned_project(project_id));

CREATE POLICY lintel_project_milestones_client_select ON project_milestones
  FOR SELECT
  USING (public.lintel_contact_linked_project(project_id));

-- -------------------------------------------------------------------------
-- Registrations, notifications, activity, and follow-ups
-- -------------------------------------------------------------------------

CREATE POLICY lintel_agent_registrations_public_insert ON agent_registrations
  FOR INSERT
  WITH CHECK (
    status = 'pending'
    AND (
      org_id IS NULL
      OR org_id = 'a0000000-0000-0000-0000-000000000001'::uuid
    )
  );

CREATE POLICY lintel_agent_registrations_staff_all ON agent_registrations
  FOR ALL
  USING (
    public.lintel_is_staff_for_org(
      COALESCE(org_id, 'a0000000-0000-0000-0000-000000000001'::uuid)
    )
  )
  WITH CHECK (
    public.lintel_is_staff_for_org(
      COALESCE(org_id, 'a0000000-0000-0000-0000-000000000001'::uuid)
    )
  );

CREATE POLICY lintel_notifications_staff_all ON notifications
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_notifications_agent_select_update ON notifications
  FOR SELECT
  USING (
    recipient_type = 'agent'
    AND recipient_id = public.lintel_agent_id()
  );

CREATE POLICY lintel_notifications_agent_update ON notifications
  FOR UPDATE
  USING (
    recipient_type = 'agent'
    AND recipient_id = public.lintel_agent_id()
  )
  WITH CHECK (
    recipient_type = 'agent'
    AND recipient_id = public.lintel_agent_id()
  );

-- Agents may create staff notifications after lot status changes.
CREATE POLICY lintel_notifications_agent_insert_staff ON notifications
  FOR INSERT
  WITH CHECK (
    public.lintel_agent_in_org(org_id)
    AND recipient_type = 'staff'
  );

CREATE POLICY lintel_activities_staff_all ON activities
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_activities_agent_select_insert ON activities
  FOR SELECT
  USING (
    agent_id = public.lintel_agent_id()
    OR public.lintel_agent_can_access_contact(contact_id)
    OR public.lintel_agent_can_access_stock(stock_id)
  );

CREATE POLICY lintel_activities_agent_insert ON activities
  FOR INSERT
  WITH CHECK (
    public.lintel_agent_in_org(org_id)
    AND (
      agent_id = public.lintel_agent_id()
      OR public.lintel_agent_can_access_contact(contact_id)
      OR public.lintel_agent_can_access_stock(stock_id)
    )
  );

CREATE POLICY lintel_follow_ups_staff_all ON follow_ups
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_follow_ups_agent_select ON follow_ups
  FOR SELECT
  USING (
    agent_id = public.lintel_agent_id()
    OR public.lintel_agent_can_access_contact(contact_id)
    OR public.lintel_agent_can_access_stock(stock_id)
  );

CREATE POLICY lintel_follow_ups_agent_insert ON follow_ups
  FOR INSERT
  WITH CHECK (
    public.lintel_agent_in_org(org_id)
    AND (
      agent_id = public.lintel_agent_id()
      OR public.lintel_agent_can_access_contact(contact_id)
      OR public.lintel_agent_can_access_stock(stock_id)
    )
  );

CREATE POLICY lintel_follow_ups_agent_update ON follow_ups
  FOR UPDATE
  USING (
    agent_id = public.lintel_agent_id()
    OR public.lintel_agent_can_access_contact(contact_id)
  )
  WITH CHECK (
    agent_id = public.lintel_agent_id()
    OR public.lintel_agent_can_access_contact(contact_id)
  );

-- -------------------------------------------------------------------------
-- Buyer interests, shares, and templates
-- -------------------------------------------------------------------------

CREATE POLICY lintel_buyer_interests_staff_all ON buyer_interests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM contacts c
      WHERE c.id = buyer_interests.contact_id
        AND public.lintel_is_staff_for_org(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM contacts c
      WHERE c.id = buyer_interests.contact_id
        AND public.lintel_is_staff_for_org(c.org_id)
    )
  );

CREATE POLICY lintel_buyer_interests_agent_all ON buyer_interests
  FOR ALL
  USING (
    public.lintel_agent_can_access_contact(contact_id)
    OR public.lintel_agent_can_access_stock(stock_id)
  )
  WITH CHECK (
    public.lintel_agent_can_access_contact(contact_id)
    AND public.lintel_agent_can_access_stock(stock_id)
  );

CREATE POLICY lintel_document_shares_staff_all ON document_shares
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_document_shares_agent_read ON document_shares
  FOR SELECT
  USING (
    shared_with_type = 'agent'
    AND shared_with_id = public.lintel_agent_id()
  );

CREATE POLICY lintel_document_shares_contact_read ON document_shares
  FOR SELECT
  USING (
    shared_with_type = 'contact'
    AND shared_with_id = public.lintel_contact_id()
  );

-- Recipients may mark their own share as viewed. RLS cannot enforce that
-- only viewed_at changed; keep the application update narrow.
CREATE POLICY lintel_document_shares_recipient_update ON document_shares
  FOR UPDATE
  USING (
    (
      shared_with_type = 'agent'
      AND shared_with_id = public.lintel_agent_id()
    )
    OR (
      shared_with_type = 'contact'
      AND shared_with_id = public.lintel_contact_id()
    )
  )
  WITH CHECK (
    (
      shared_with_type = 'agent'
      AND shared_with_id = public.lintel_agent_id()
    )
    OR (
      shared_with_type = 'contact'
      AND shared_with_id = public.lintel_contact_id()
    )
  );

CREATE POLICY lintel_email_templates_staff_all ON email_templates
  FOR ALL
  USING (public.lintel_is_staff_for_org(org_id))
  WITH CHECK (public.lintel_is_staff_for_org(org_id));

CREATE POLICY lintel_email_templates_agent_read ON email_templates
  FOR SELECT
  USING (public.lintel_agent_in_org(org_id));

-- -------------------------------------------------------------------------
-- Known follow-up before live apply
-- -------------------------------------------------------------------------
-- 1. Apply phase5 for narrow agent status updates and storage.objects
--    policies.
-- 2. Smoke-test all three roles against a staging database before applying
--    this migration to production.
