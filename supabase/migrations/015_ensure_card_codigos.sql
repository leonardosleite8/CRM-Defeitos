-- Garante coluna codigo + sequência + backfill de TODOS os cards (CD0001, CD0002…).
-- Rode no SQL Editor do Supabase se os IDs aparecerem vazios.

CREATE SEQUENCE IF NOT EXISTS defect_cards_codigo_seq;

ALTER TABLE defect_cards
  ADD COLUMN IF NOT EXISTS codigo INTEGER;

-- Zera códigos inválidos para reatribuir
UPDATE defect_cards SET codigo = NULL WHERE codigo IS NULL OR codigo <= 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY data_criacao ASC, id ASC) AS rn
  FROM defect_cards
  WHERE codigo IS NULL
)
UPDATE defect_cards AS c
SET codigo = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

SELECT setval(
  'defect_cards_codigo_seq',
  (SELECT COALESCE(MAX(codigo), 0) FROM defect_cards)
);

ALTER TABLE defect_cards
  ALTER COLUMN codigo SET DEFAULT nextval('defect_cards_codigo_seq');

UPDATE defect_cards
SET codigo = nextval('defect_cards_codigo_seq')
WHERE codigo IS NULL OR codigo <= 0;

ALTER TABLE defect_cards
  ALTER COLUMN codigo SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_defect_cards_codigo_unique
  ON defect_cards (codigo);

ALTER TABLE defect_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Função chamada pelo app para garantir códigos faltantes
CREATE OR REPLACE FUNCTION ensure_defect_card_codigos()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  assigned integer := 0;
  r RECORD;
  next_code integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'defect_cards' AND column_name = 'codigo'
  ) THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(MAX(codigo), 0) INTO next_code FROM defect_cards;

  FOR r IN
    SELECT id FROM defect_cards
    WHERE codigo IS NULL OR codigo <= 0
    ORDER BY data_criacao ASC, id ASC
  LOOP
    next_code := next_code + 1;
    UPDATE defect_cards SET codigo = next_code WHERE id = r.id;
    assigned := assigned + 1;
  END LOOP;

  PERFORM setval('defect_cards_codigo_seq', GREATEST(COALESCE((SELECT MAX(codigo) FROM defect_cards), 0), 1));
  RETURN assigned;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_defect_card_codigos() TO anon, authenticated;
