-- Phase 3: Communication, Document Sharing & Email Templates

-- Table: document_shares — Track when documents are shared with clients/agents
CREATE TABLE IF NOT EXISTS document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT 'a0000000-0000-0000-0000-000000000001',
  document_type TEXT CHECK (document_type IN ('project_document', 'client_document')) NOT NULL,
  document_id UUID NOT NULL,
  shared_with_id UUID NOT NULL,
  shared_with_type TEXT CHECK (shared_with_type IN ('contact', 'agent')) NOT NULL,
  shared_by TEXT,
  delivery_method TEXT CHECK (delivery_method IN ('email', 'portal', 'link')) DEFAULT 'portal',
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_shares_all ON document_shares FOR ALL USING (true);
CREATE INDEX idx_doc_shares_doc ON document_shares(document_id);
CREATE INDEX idx_doc_shares_recipient ON document_shares(shared_with_id);

-- Table: email_templates — Reusable email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT 'a0000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT CHECK (category IN ('welcome', 'follow_up', 'document', 'inspection', 'contract', 'settlement', 'marketing', 'custom')) NOT NULL DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_templates_all ON email_templates FOR ALL USING (true);

-- Seed templates
INSERT INTO email_templates (name, subject, body, category) VALUES
  ('Welcome New Lead', 'Welcome to {{project_name}}', E'Hi {{first_name}},\n\nThank you for your interest in {{project_name}}. I''d love to arrange a time to show you through the development.\n\nPlease let me know a time that works for you.\n\nBest regards,\n{{agent_name}}', 'welcome'),
  ('Inspection Follow Up', 'Great meeting you at {{project_name}}', E'Hi {{first_name}},\n\nIt was great showing you through {{project_name}} today. As discussed, I''ve attached the floorplans and price list for your review.\n\nPlease don''t hesitate to reach out if you have any questions.\n\nBest regards,\n{{agent_name}}', 'follow_up'),
  ('Contract Sent', 'Contract of Sale — {{lot_number}} at {{project_name}}', E'Hi {{first_name}},\n\nPlease find attached the Contract of Sale for {{lot_number}} at {{project_name}}.\n\nPlease review with your solicitor and return the signed copy at your earliest convenience.\n\nBest regards,\n{{agent_name}}', 'contract'),
  ('Settlement Reminder', 'Settlement Update — {{lot_number}} at {{project_name}}', E'Hi {{first_name}},\n\nJust a reminder that settlement for {{lot_number}} at {{project_name}} is scheduled for {{settlement_date}}.\n\nPlease ensure all documentation is in order with your solicitor and financier.\n\nBest regards,\n{{agent_name}}', 'settlement'),
  ('Price List', 'Updated Price List — {{project_name}}', E'Hi {{first_name}},\n\nPlease find the latest price list for {{project_name}} attached.\n\nLet me know if any of the available lots interest you and I can arrange a viewing.\n\nBest regards,\n{{agent_name}}', 'marketing');
