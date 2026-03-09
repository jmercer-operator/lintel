-- Phase 2: Developer Intelligence — Settlement tracking columns
ALTER TABLE stock ADD COLUMN IF NOT EXISTS reservation_date DATE;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS reservation_expiry DATE;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS contract_issued_date DATE;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS contract_exchanged_date DATE;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS settlement_date DATE;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS settlement_status TEXT CHECK (settlement_status IN ('not_applicable', 'pending', 'finance_pending', 'finance_approved', 'settling_soon', 'settled', 'fallen_over')) DEFAULT 'not_applicable';
ALTER TABLE stock ADD COLUMN IF NOT EXISTS incentives TEXT;
ALTER TABLE stock ADD COLUMN IF NOT EXISTS sales_channel TEXT CHECK (sales_channel IN ('agent', 'direct', 'referral', 'website', 'event')) DEFAULT 'agent';

-- Seed some dates for existing stock
UPDATE stock SET reservation_date = CURRENT_DATE - interval '20 days', contract_exchanged_date = CURRENT_DATE - interval '10 days', settlement_date = CURRENT_DATE + interval '60 days', settlement_status = 'finance_approved', sales_channel = 'agent' WHERE status = 'Exchanged';
UPDATE stock SET reservation_date = CURRENT_DATE - interval '5 days', settlement_status = 'not_applicable', sales_channel = 'agent' WHERE status = 'Under Contract';
UPDATE stock SET reservation_date = CURRENT_DATE - interval '30 days', contract_exchanged_date = CURRENT_DATE - interval '25 days', settlement_date = CURRENT_DATE - interval '2 days', settlement_status = 'settled', sales_channel = 'agent' WHERE status = 'Settled';
UPDATE stock SET settlement_status = 'not_applicable' WHERE status IN ('Available', 'EOI');
