-- Client-document uploads have always failed: the UI and server action submit
-- display labels ("Signed Contract", "Trust Receipt", ...) while the check
-- constraint only accepted the original CP5a slugs (signed_contract, ...).
-- No rows exist under the old constraint, so this replacement is safe.
-- Canonical list: CLIENT_DOCUMENT_TYPES in src/lib/data/documents.ts.

ALTER TABLE client_documents
  DROP CONSTRAINT IF EXISTS client_documents_document_type_check;

ALTER TABLE client_documents
  ADD CONSTRAINT client_documents_document_type_check
  CHECK (document_type IN (
    'Signed Contract',
    'Exchanged Contract',
    'Trust Receipt',
    'ID Document',
    'Solicitor Letter',
    'Deposit Receipt',
    'FIRB',
    'Other'
  ));
