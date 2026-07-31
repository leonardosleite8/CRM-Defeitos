-- Código global único por card (nunca reutilizado após exclusão).
CREATE SEQUENCE IF NOT EXISTS defect_cards_codigo_seq;

ALTER TABLE defect_cards
  ADD COLUMN IF NOT EXISTS codigo INTEGER;

-- Backfill cards existentes (ordem de criação).
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY data_criacao ASC, id ASC) AS rn
  FROM defect_cards
  WHERE codigo IS NULL
)
UPDATE defect_cards AS c
SET codigo = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

-- Próximo nextval = MAX(codigo) + 1 (ou 1 se vazio).
SELECT setval(
  'defect_cards_codigo_seq',
  (SELECT COALESCE(MAX(codigo), 0) FROM defect_cards)
);

ALTER TABLE defect_cards
  ALTER COLUMN codigo SET DEFAULT nextval('defect_cards_codigo_seq');

UPDATE defect_cards SET codigo = nextval('defect_cards_codigo_seq') WHERE codigo IS NULL;

ALTER TABLE defect_cards
  ALTER COLUMN codigo SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_defect_cards_codigo_unique
  ON defect_cards (codigo);

-- Comentários editáveis
ALTER TABLE defect_comments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
