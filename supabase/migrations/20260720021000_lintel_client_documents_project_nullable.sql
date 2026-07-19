-- client_documents.project_id was made NOT NULL out-of-band, but LINTEL
-- uploads client documents (ID, solicitor letter, FIRB) for contacts who may
-- not be linked to any lot/project yet. Allow NULL; the app populates
-- project_id/stock_id from contact_stock when a link exists.

ALTER TABLE client_documents
  ALTER COLUMN project_id DROP NOT NULL;
