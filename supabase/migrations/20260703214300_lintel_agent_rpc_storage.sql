-- Phase 5: Narrow agent status updates and lock storage object access.
--
-- Depends on phase4 helper functions:
-- - lintel_agent_id()
-- - lintel_is_staff_for_org(uuid)
-- - lintel_agent_in_org(uuid)
-- - lintel_agent_assigned_project(uuid)
-- - lintel_contact_linked_project(uuid)
-- - lintel_agent_can_access_contact(uuid)
-- - lintel_contact_id()

-- -------------------------------------------------------------------------
-- Agent lot status RPC
-- -------------------------------------------------------------------------
-- Agents use this instead of direct UPDATE privileges on public.stock.
-- It only permits status/updated_at changes for lots assigned to the
-- authenticated agent. Staff updates continue through normal table policies.

CREATE OR REPLACE FUNCTION public.lintel_agent_update_lot_status(
  target_stock_id uuid,
  target_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  acting_agent_id uuid;
  target_lot record;
BEGIN
  acting_agent_id := public.lintel_agent_id();

  IF acting_agent_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized'
      USING ERRCODE = '28000';
  END IF;

  IF target_status NOT IN ('Available', 'EOI', 'Under Contract', 'Exchanged') THEN
    RAISE EXCEPTION 'Agents cannot set this lot status'
      USING ERRCODE = '42501';
  END IF;

  SELECT s.id, s.agent_id, s.org_id, s.project_id, s.lot_number
  INTO target_lot
  FROM public.stock s
  WHERE s.id = target_stock_id
  FOR UPDATE;

  IF target_lot.id IS NULL THEN
    RAISE EXCEPTION 'Lot not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF target_lot.agent_id IS DISTINCT FROM acting_agent_id THEN
    RAISE EXCEPTION 'Forbidden'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.stock
  SET status = target_status,
      updated_at = now()
  WHERE id = target_stock_id
    AND agent_id = acting_agent_id;

  IF target_status = 'Available' THEN
    DELETE FROM public.contact_stock
    WHERE stock_id = target_stock_id;
  END IF;

  RETURN jsonb_build_object(
    'id', target_stock_id,
    'status', target_status,
    'project_id', target_lot.project_id,
    'lot_number', target_lot.lot_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_agent_update_lot_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lintel_agent_update_lot_status(uuid, text) TO authenticated;

-- -------------------------------------------------------------------------
-- Storage path helpers
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_storage_path_org(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  first_segment text;
BEGIN
  first_segment := split_part(object_name, '/', 1);
  RETURN first_segment::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.lintel_storage_path_project(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  second_segment text;
BEGIN
  second_segment := split_part(object_name, '/', 2);
  IF second_segment = 'progress' THEN
    second_segment := split_part(object_name, '/', 3);
  END IF;
  RETURN second_segment::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.lintel_storage_path_contact(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  second_segment text;
BEGIN
  second_segment := split_part(object_name, '/', 2);
  RETURN second_segment::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_storage_path_org(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_storage_path_project(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_storage_path_contact(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.lintel_storage_path_org(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_storage_path_project(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_storage_path_contact(text) TO authenticated;

-- -------------------------------------------------------------------------
-- Storage policies
-- -------------------------------------------------------------------------
-- These policies preserve current path conventions:
-- - project-documents: {org_id}/{project_id}/{category_id}/{file}
-- - project progress media: {org_id}/progress/{project_id}/...
-- - client-documents: {org_id}/{contact_id}/{document_type}/{file}

DROP POLICY IF EXISTS lintel_project_documents_storage_staff_select ON storage.objects;
DROP POLICY IF EXISTS lintel_project_documents_storage_staff_insert ON storage.objects;
DROP POLICY IF EXISTS lintel_project_documents_storage_staff_update ON storage.objects;
DROP POLICY IF EXISTS lintel_project_documents_storage_staff_delete ON storage.objects;
DROP POLICY IF EXISTS lintel_project_documents_storage_agent_select ON storage.objects;
DROP POLICY IF EXISTS lintel_project_documents_storage_client_select ON storage.objects;
DROP POLICY IF EXISTS lintel_client_documents_storage_staff_select ON storage.objects;
DROP POLICY IF EXISTS lintel_client_documents_storage_staff_insert ON storage.objects;
DROP POLICY IF EXISTS lintel_client_documents_storage_staff_update ON storage.objects;
DROP POLICY IF EXISTS lintel_client_documents_storage_staff_delete ON storage.objects;
DROP POLICY IF EXISTS lintel_client_documents_storage_agent_select ON storage.objects;
DROP POLICY IF EXISTS lintel_client_documents_storage_agent_insert ON storage.objects;
DROP POLICY IF EXISTS lintel_client_documents_storage_client_select ON storage.objects;

CREATE POLICY lintel_project_documents_storage_staff_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_project_documents_storage_staff_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_project_documents_storage_staff_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  )
  WITH CHECK (
    bucket_id = 'project-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_project_documents_storage_staff_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_project_documents_storage_agent_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND (
      EXISTS (
        SELECT 1
        FROM public.project_documents pd
        WHERE pd.file_path = storage.objects.name
          AND pd.visibility IN ('agent', 'client')
          AND public.lintel_agent_assigned_project(pd.project_id)
      )
      OR (
        split_part(storage.objects.name, '/', 2) = 'progress'
        AND public.lintel_agent_assigned_project(
          public.lintel_storage_path_project(storage.objects.name)
        )
      )
    )
  );

CREATE POLICY lintel_project_documents_storage_client_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-documents'
    AND EXISTS (
      SELECT 1
      FROM public.project_documents pd
      WHERE pd.file_path = storage.objects.name
        AND pd.visibility = 'client'
        AND public.lintel_contact_linked_project(pd.project_id)
    )
  );

CREATE POLICY lintel_client_documents_storage_staff_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_client_documents_storage_staff_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_client_documents_storage_staff_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  )
  WITH CHECK (
    bucket_id = 'client-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_client_documents_storage_staff_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND public.lintel_is_staff_for_org(public.lintel_storage_path_org(name))
  );

CREATE POLICY lintel_client_documents_storage_agent_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.client_documents cd
      WHERE cd.file_path = storage.objects.name
        AND cd.visibility IN ('agent', 'client')
        AND public.lintel_agent_can_access_contact(cd.contact_id)
    )
  );

CREATE POLICY lintel_client_documents_storage_agent_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'client-documents'
    AND public.lintel_agent_can_access_contact(
      public.lintel_storage_path_contact(name)
    )
  );

CREATE POLICY lintel_client_documents_storage_client_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'client-documents'
    AND EXISTS (
      SELECT 1
      FROM public.client_documents cd
      WHERE cd.file_path = storage.objects.name
        AND cd.visibility = 'client'
        AND cd.contact_id = public.lintel_contact_id()
    )
  );
