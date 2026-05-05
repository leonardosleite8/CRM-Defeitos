-- PASSO 2 — Rode só DEPOIS que o passo 1 confirmar que "Aguardando" e "Em execução" existem no enum.
--
-- IMPORTANTE: o CHECK antigo só permite Análise/Ação Corretiva/... — por isso é obrigatório
-- DROP do constraint ANTES de atualizar linhas para Aguardando / Em execução / Concluído.

ALTER TABLE kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_status_ref_check;

UPDATE defect_cards
SET status = 'Aguardando'::defect_status
WHERE status::text = 'Análise';

UPDATE defect_cards
SET status = 'Em execução'::defect_status
WHERE status::text IN ('Ação Corretiva', 'Validação');

UPDATE kanban_columns
SET
  status_ref = CASE status_ref
    WHEN 'Análise' THEN 'Aguardando'
    WHEN 'Ação Corretiva' THEN 'Em execução'
    WHEN 'Validação' THEN 'Em execução'
    ELSE status_ref
  END,
  titulo = CASE titulo
    WHEN 'Análise' THEN 'Aguardando'
    WHEN 'Ação Corretiva' THEN 'Em execução'
    WHEN 'Validação' THEN 'Em execução'
    ELSE titulo
  END
WHERE status_ref IN ('Análise', 'Ação Corretiva', 'Validação')
   OR titulo IN ('Análise', 'Ação Corretiva', 'Validação');

ALTER TABLE kanban_columns
ADD CONSTRAINT kanban_columns_status_ref_check CHECK (
  status_ref IS NULL OR status_ref IN ('Aguardando', 'Em execução', 'Concluído')
);

ALTER TABLE defect_cards
ALTER COLUMN status SET DEFAULT 'Aguardando'::defect_status;
