-- PLANO B — Use só se o Passo 1 ainda não criar "Aguardando" / "Em execução"
-- (por exemplo: Postgres antigo sem IF NOT EXISTS, ou enum corrompido).
-- Recria o tipo enum do zero e reconverte a coluna status.
--
-- Rode o arquivo INTEIRO de uma vez no SQL Editor.

DROP TRIGGER IF EXISTS defect_cards_touch ON defect_cards;
DROP FUNCTION IF EXISTS trg_defect_cards_touch();

ALTER TABLE defect_cards ALTER COLUMN status DROP DEFAULT;

ALTER TABLE defect_cards
ALTER COLUMN status TYPE text USING status::text;

DROP TYPE IF EXISTS defect_status CASCADE;

CREATE TYPE defect_status AS ENUM (
  'Aguardando',
  'Em execução',
  'Concluído'
);

ALTER TABLE defect_cards
ALTER COLUMN status TYPE defect_status
USING (
  CASE status
    WHEN 'Análise' THEN 'Aguardando'::defect_status
    WHEN 'Ação Corretiva' THEN 'Em execução'::defect_status
    WHEN 'Validação' THEN 'Em execução'::defect_status
    WHEN 'Concluído' THEN 'Concluído'::defect_status
    WHEN 'Aguardando' THEN 'Aguardando'::defect_status
    WHEN 'Em execução' THEN 'Em execução'::defect_status
    ELSE 'Aguardando'::defect_status
  END
);

ALTER TABLE defect_cards
ALTER COLUMN status SET DEFAULT 'Aguardando'::defect_status;

CREATE OR REPLACE FUNCTION trg_defect_cards_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao := timezone('utc', now());
  IF NEW.status = 'Concluído'::defect_status THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.data_conclusao IS NULL THEN
        NEW.data_conclusao := timezone('utc', now());
      END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'Concluído'::defect_status THEN
      IF NEW.data_conclusao IS NULL THEN
        NEW.data_conclusao := timezone('utc', now());
      END IF;
    END IF;
  ELSE
    NEW.data_conclusao := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER defect_cards_touch
BEFORE INSERT OR UPDATE ON defect_cards
FOR EACH ROW EXECUTE PROCEDURE trg_defect_cards_touch();

ALTER TABLE kanban_columns DROP CONSTRAINT IF EXISTS kanban_columns_status_ref_check;

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
