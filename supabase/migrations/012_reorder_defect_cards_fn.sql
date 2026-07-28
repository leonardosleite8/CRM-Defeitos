-- Reordenação de cards em uma única chamada (rápida).
-- Rode no SQL Editor do Supabase se ainda não existir.

CREATE OR REPLACE FUNCTION reorder_defect_cards(
  p_board_id UUID,
  p_ordered_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Temporário único por id (evita colisão)
  UPDATE defect_cards c
  SET ordem = - (s.ord::INTEGER)
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS s(id, ord)
  WHERE c.id = s.id
    AND c.board_id = p_board_id;

  -- Ordem final 0..n-1
  UPDATE defect_cards c
  SET ordem = (s.ord::INTEGER) - 1
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS s(id, ord)
  WHERE c.id = s.id
    AND c.board_id = p_board_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_defect_cards(UUID, UUID[]) TO anon, authenticated;
