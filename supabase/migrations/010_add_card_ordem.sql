-- Permite reordenar cards dentro (e entre) colunas do Kanban.

ALTER TABLE defect_cards
  ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY column_id
      ORDER BY data_criacao ASC, id ASC
    ) - 1 AS rn
  FROM defect_cards
)
UPDATE defect_cards AS c
SET ordem = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_defect_cards_column_ordem
  ON defect_cards (column_id, ordem);
