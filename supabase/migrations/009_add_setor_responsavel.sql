-- Hotfix para bancos que ainda não possuem a coluna setor_responsavel.

ALTER TABLE defect_cards
ADD COLUMN IF NOT EXISTS setor_responsavel TEXT NOT NULL DEFAULT 'Outros';

UPDATE defect_cards
SET setor_responsavel = 'Outros'
WHERE setor_responsavel IS NULL OR setor_responsavel = '';

ALTER TABLE defect_cards
DROP CONSTRAINT IF EXISTS defect_cards_setor_responsavel_check;

ALTER TABLE defect_cards
ADD CONSTRAINT defect_cards_setor_responsavel_check
CHECK (setor_responsavel IN ('Produção', 'Comercial', 'ATU', 'P&D', 'Marketing', 'Outros'));

CREATE INDEX IF NOT EXISTS idx_defect_cards_setor_responsavel ON defect_cards(setor_responsavel);
