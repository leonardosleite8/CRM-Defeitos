-- Adiciona coluna ausente em projetos criados antes da atualização do schema.
-- Execute no SQL Editor do Supabase se aparecer:
-- "Could not find the 'previsao_conclusao' column of 'defect_cards' in the schema cache"

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'defect_cards'
      AND column_name = 'previsao_conclusao'
  ) THEN
    ALTER TABLE defect_cards ADD COLUMN previsao_conclusao DATE;
  END IF;
END$$;
