"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { DefectOrigem, DefectSeveridade, DefectStatus } from "@/lib/constants";
import { getCardDetail } from "@/lib/queries/boards";
import { revalidatePath } from "next/cache";

function revalidateBoard(boardId: string) {
  revalidatePath(`/quadros/${boardId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

const STATUS_VALUES: DefectStatus[] = ["Aguardando", "Em execução", "Concluído"];

function parseStatusRef(ref: string | null): DefectStatus | null {
  if (!ref) return null;
  return STATUS_VALUES.includes(ref as DefectStatus) ? (ref as DefectStatus) : null;
}

export async function updateBoardTitulo(boardId: string, titulo: string) {
  const supabase = createServerSupabase();
  const t = titulo.trim();
  if (!t) throw new Error("Título do quadro não pode ser vazio.");
  const { error } = await supabase.from("boards").update({ titulo: t }).eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function createBoardWithDefaults(titulo: string) {
  const supabase = createServerSupabase();
  const { data: board, error: e1 } = await supabase
    .from("boards")
    .insert({ titulo })
    .select("id")
    .single();
  if (e1 || !board) throw new Error(e1?.message ?? "Falha ao criar quadro");

  const cols = STATUS_VALUES.map((s, i) => ({
    board_id: board.id,
    titulo: s,
    ordem: i,
    status_ref: s,
  }));
  const { error: e2 } = await supabase.from("kanban_columns").insert(cols);
  if (e2) throw new Error(e2.message);
  revalidatePath("/");
  return board.id as string;
}

export async function deleteBoard(boardId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function createDefectCard(input: {
  boardId: string;
  columnId: string;
  titulo: string;
  descricao: string;
  solucao: string;
  origem: DefectOrigem;
  setorResponsavel: DefectOrigem;
  severidade: DefectSeveridade;
  modeloProduto: string[];
  linha: string[];
  responsavel: string;
  mediaUrls: string[];
  previsaoConclusao: string | null;
}) {
  if (!input.modeloProduto.length) throw new Error("Selecione ao menos um modelo de produto.");
  if (!input.linha.length) throw new Error("Selecione ao menos uma linha.");

  const supabase = createServerSupabase();
  const { data: col } = await supabase
    .from("kanban_columns")
    .select("status_ref")
    .eq("id", input.columnId)
    .single();
  const statusFromCol = parseStatusRef(col?.status_ref ?? null);
  const status: DefectStatus = statusFromCol ?? "Aguardando";

  const { data: card, error } = await supabase
    .from("defect_cards")
    .insert({
      board_id: input.boardId,
      column_id: input.columnId,
      titulo: input.titulo,
      descricao: input.descricao || null,
      solucao: input.solucao || null,
      origem: input.origem,
      setor_responsavel: input.setorResponsavel,
      status,
      severidade: input.severidade,
      modelo_produto: input.modeloProduto,
      linha: input.linha,
      responsavel: input.responsavel || null,
      media_urls: input.mediaUrls,
      previsao_conclusao: input.previsaoConclusao || null,
    })
    .select("id")
    .single();
  if (error || !card) throw new Error(error?.message ?? "Falha ao criar card");
  revalidateBoard(input.boardId);
  return card.id as string;
}

export async function updateDefectCardMedia(cardId: string, boardId: string, mediaUrls: string[]) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("defect_cards").update({ media_urls: mediaUrls }).eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function moveCardToColumn(
  cardId: string,
  boardId: string,
  newColumnId: string,
  _previousColumnId?: string,
) {
  const supabase = createServerSupabase();
  const { data: col } = await supabase
    .from("kanban_columns")
    .select("status_ref")
    .eq("id", newColumnId)
    .single();
  const statusFromCol = parseStatusRef(col?.status_ref ?? null);

  const patch: Record<string, unknown> = { column_id: newColumnId };
  if (statusFromCol) patch.status = statusFromCol;

  const { error } = await supabase.from("defect_cards").update(patch).eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function updateDefectCardFields(
  cardId: string,
  boardId: string,
  fields: Partial<{
    titulo: string;
    descricao: string;
    solucao: string;
    origem: DefectOrigem;
    setor_responsavel: DefectOrigem;
    severidade: DefectSeveridade;
    modelo_produto: string[];
    linha: string[];
    media_urls: string[];
    responsavel: string;
    status: DefectStatus;
    previsao_conclusao: string | null;
  }>,
) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("defect_cards").update(fields).eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function deleteDefectCard(cardId: string, boardId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("defect_cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidatePath(`/quadros/${boardId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function addComment(cardId: string, boardId: string, texto: string, autor: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("defect_comments").insert({
    card_id: cardId,
    texto,
    autor: autor || null,
  });
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function fetchCardDetail(cardId: string) {
  return getCardDetail(cardId);
}
