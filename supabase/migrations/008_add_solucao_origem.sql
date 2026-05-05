-- Adiciona novos campos de formulário nos cards para compatibilizar com frontend atualizado.

ALTER TABLE defect_cards
ADD COLUMN IF NOT EXISTS solucao TEXT;

ALTER TABLE defect_cards
ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'Outros';

ALTER TABLE defect_cards
ADD COLUMN IF NOT EXISTS setor_responsavel TEXT NOT NULL DEFAULT 'Outros';

UPDATE defect_cards
SET origem = 'Outros'
WHERE origem IS NULL OR origem = '';

UPDATE defect_cards
SET setor_responsavel = 'Outros'
WHERE setor_responsavel IS NULL OR setor_responsavel = '';

ALTER TABLE defect_cards
DROP CONSTRAINT IF EXISTS defect_cards_origem_check;

ALTER TABLE defect_cards
ADD CONSTRAINT defect_cards_origem_check
CHECK (origem IN ('Produção', 'Comercial', 'ATU', 'P&D', 'Marketing', 'Outros'));

ALTER TABLE defect_cards
DROP CONSTRAINT IF EXISTS defect_cards_setor_responsavel_check;

ALTER TABLE defect_cards
ADD CONSTRAINT defect_cards_setor_responsavel_check
CHECK (setor_responsavel IN ('Produção', 'Comercial', 'ATU', 'P&D', 'Marketing', 'Outros'));

CREATE INDEX IF NOT EXISTS idx_defect_cards_origem ON defect_cards(origem);
