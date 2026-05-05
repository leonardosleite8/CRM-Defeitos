import type { DefectOrigem, DefectSeveridade, DefectStatus } from "@/lib/constants";

export type BoardRow = {
  id: string;
  titulo: string;
  created_at: string;
  updated_at: string;
};

export type KanbanColumnRow = {
  id: string;
  board_id: string;
  titulo: string;
  ordem: number;
  status_ref: string | null;
  created_at: string;
};

export type DefectCardRow = {
  id: string;
  board_id: string;
  column_id: string;
  titulo: string;
  descricao: string | null;
  solucao: string | null;
  origem: DefectOrigem;
  setor_responsavel: DefectOrigem;
  status: DefectStatus;
  severidade: DefectSeveridade;
  modelo_produto: string[];
  linha: string[];
  media_urls: string[];
  responsavel: string | null;
  data_criacao: string;
  data_atualizacao: string;
  data_conclusao: string | null;
  previsao_conclusao: string | null;
};

export type DefectCommentRow = {
  id: string;
  card_id: string;
  autor: string | null;
  texto: string;
  created_at: string;
};

export type BoardPayload = {
  board: BoardRow;
  columns: KanbanColumnRow[];
  cards: DefectCardRow[];
};
