-- Phase 6: remove temporary direct agent mutation policies.
--
-- Agents must change lot status through lintel_agent_update_lot_status().
-- That RPC only updates status/updated_at for lots assigned to the
-- authenticated agent and handles Available cleanup internally.

DROP POLICY IF EXISTS lintel_stock_agent_update_owned ON stock;
DROP POLICY IF EXISTS lintel_contact_stock_agent_delete ON contact_stock;
