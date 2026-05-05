-- Corrige bancos criados com o enum antigo (Análise / Ação Corretiva / Validação / Concluído).
-- Erro típico: invalid input value for enum defect_status: "Aguardando"
--
-- Execute no SQL Editor do Supabase (uma vez).

-- 1) Garantir que os novos valores existem no tipo enum
ALTER TYPE defect_status ADD VALUE IF NOT EXISTS 'Aguardando';
ALTER TYPE defect_status ADD VALUE IF NOT EXISTS 'Em execução';

-- 2) Remover CHECK antigo ANTES de gravar Aguardando / Em execução nas linhas
ALTER TABLE kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_status_ref_check;

-- 3) Migrar cards existentes (rótulos antigos -> novos)
UPDATE defect_cards
SET status = 'Aguardando'::defect_status
WHERE status::text = 'Análise';

UPDATE defect_cards
SET status = 'Em execução'::defect_status
WHERE status::text IN ('Ação Corretiva', 'Validação');

-- 4) Atualizar colunas do kanban (título + status_ref alinhados ao app)
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

-- 5) CHECK novo: só os três status atuais
ALTER TABLE kanban_columns
ADD CONSTRAINT kanban_columns_status_ref_check CHECK (
  status_ref IS NULL OR status_ref IN ('Aguardando', 'Em execução', 'Concluído')
);

-- 6) Default do card alinhado ao schema novo
ALTER TABLE defect_cards
ALTER COLUMN status SET DEFAULT 'Aguardando'::defect_status;
