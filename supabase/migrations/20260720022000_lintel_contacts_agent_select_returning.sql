-- Agents could not create contacts through the app: createContactAction uses
-- INSERT ... RETURNING, whose returned row is checked against the SELECT
-- policy. lintel_agent_can_access_contact() re-queries contacts with the
-- command snapshot, which cannot see the row being inserted, so the check
-- always failed. Inline the referring-agent predicate so the new tuple is
-- evaluated directly; keep the function for the linked-stock access path.

DROP POLICY IF EXISTS lintel_contacts_agent_select ON contacts;
CREATE POLICY lintel_contacts_agent_select ON contacts
  FOR SELECT USING (
    referring_agent_id = public.lintel_agent_id()
    OR public.lintel_agent_can_access_contact(id)
  );
