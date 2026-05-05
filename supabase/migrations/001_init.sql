-- Defeitos de Produtos — schema inicial (execute no SQL Editor do Supabase ou via CLI)
-- Storage: crie o bucket público "defect-media" em Storage > New bucket > nome: defect-media, public: on

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE defect_status AS ENUM (
  'Aguardando',
  'Em execução',
  'Concluído'
);

CREATE TYPE defect_severidade AS ENUM (
  'Baixa',
  'Média',
  'Alta',
  'Crítica'
);

CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  status_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT kanban_columns_status_ref_check CHECK (
    status_ref IS NULL OR status_ref IN ('Aguardando', 'Em execução', 'Concluído')
  )
);

CREATE TABLE defect_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES kanban_columns(id) ON DELETE RESTRICT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  solucao TEXT,
  origem TEXT NOT NULL DEFAULT 'Outros' CHECK (origem IN ('Produção', 'Comercial', 'ATU', 'P&D', 'Marketing', 'Outros')),
  setor_responsavel TEXT NOT NULL DEFAULT 'Outros' CHECK (setor_responsavel IN ('Produção', 'Comercial', 'ATU', 'P&D', 'Marketing', 'Outros')),
  status defect_status NOT NULL DEFAULT 'Aguardando',
  severidade defect_severidade NOT NULL DEFAULT 'Baixa',
  modelo_produto TEXT[] NOT NULL DEFAULT '{}',
  linha TEXT[] NOT NULL DEFAULT '{}',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  responsavel TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  data_conclusao TIMESTAMPTZ,
  previsao_conclusao DATE
);

CREATE TABLE defect_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES defect_cards(id) ON DELETE CASCADE,
  autor TEXT,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_defect_cards_board ON defect_cards(board_id);
CREATE INDEX idx_defect_cards_column ON defect_cards(column_id);
CREATE INDEX idx_kanban_columns_board ON kanban_columns(board_id);
CREATE INDEX idx_defect_comments_card ON defect_comments(card_id);

CREATE OR REPLACE FUNCTION trg_boards_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER boards_updated_at
BEFORE UPDATE ON boards
FOR EACH ROW EXECUTE PROCEDURE trg_boards_touch_updated_at();

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

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY boards_all ON boards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY kanban_columns_all ON kanban_columns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY defect_cards_all ON defect_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY defect_comments_all ON defect_comments FOR ALL USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('defect-media', 'defect-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "defect-media read"
ON storage.objects FOR SELECT
USING (bucket_id = 'defect-media');

CREATE POLICY "defect-media insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'defect-media');

CREATE POLICY "defect-media update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'defect-media');

CREATE POLICY "defect-media delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'defect-media');
