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
    // Mantemos null para evitar falha com constraints legadas de status_ref.
    status_ref: null,
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

export async function createColumn(boardId: string, titulo: string) {
  const supabase = createServerSupabase();
  const t = titulo.trim();
  if (!t) throw new Error("Informe um nome para a coluna.");
  const { data: maxRow } = await supabase
    .from("kanban_columns")
    .select("ordem")
    .eq("board_id", boardId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (maxRow?.ordem ?? -1) + 1;
  const { error } = await supabase.from("kanban_columns").insert({
    board_id: boardId,
    titulo: t,
    ordem: nextOrdem,
    status_ref: null,
  });
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function renameColumn(columnId: string, boardId: string, titulo: string) {
  const supabase = createServerSupabase();
  const t = titulo.trim();
  if (!t) throw new Error("Nome da coluna não pode ser vazio.");
  const { error } = await supabase.from("kanban_columns").update({ titulo: t }).eq("id", columnId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function deleteColumn(columnId: string, boardId: string) {
  const supabase = createServerSupabase();
  const { count } = await supabase
    .from("defect_cards")
    .select("*", { count: "exact", head: true })
    .eq("column_id", columnId);
  if ((count ?? 0) > 0) {
    throw new Error("Mova os cards desta coluna antes de excluir.");
  }
  const { error } = await supabase.from("kanban_columns").delete().eq("id", columnId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function reorderColumns(boardId: string, orderedColumnIds: string[]) {
  if (!orderedColumnIds.length) return;
  const supabase = createServerSupabase();
  const updates = orderedColumnIds.map((id, index) =>
    supabase.from("kanban_columns").update({ ordem: index }).eq("id", id).eq("board_id", boardId),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
  revalidateBoard(boardId);
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
    .select("status_ref,titulo")
    .eq("id", input.columnId)
    .single();
  const statusFromCol = parseStatusRef(col?.status_ref ?? null) ?? parseStatusRef(col?.titulo ?? null);
  const status: DefectStatus = statusFromCol ?? "Aguardando";

  const baseRow: Record<string, unknown> = {
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
  };

  // Tenta com ordem (migration 010). Novo card sempre no TOPO (menor ordem).
  const { data: minRow, error: minErr } = await supabase
    .from("defect_cards")
    .select("ordem")
    .eq("column_id", input.columnId)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  const missingOrdem =
    !!minErr &&
    (/ordem/i.test(minErr.message) || /column/i.test(minErr.message) || minErr.code === "42703");

  let insertPayload = { ...baseRow };
  if (!missingOrdem) {
    const topOrdem = typeof minRow?.ordem === "number" ? minRow.ordem - 1 : 0;
    insertPayload = { ...baseRow, ordem: topOrdem };
  }

  let { data: card, error } = await supabase.from("defect_cards").insert(insertPayload).select("id").single();

  if (
    error &&
    (/ordem/i.test(error.message) || /column/i.test(error.message) || error.code === "42703")
  ) {
    const retry = await supabase.from("defect_cards").insert(baseRow).select("id").single();
    card = retry.data;
    error = retry.error;
  }

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

export async function reorderCardsInColumn(
  boardId: string,
  columnId: string,
  orderedCardIds: string[],
) {
  if (!orderedCardIds.length) return;
  const supabase = createServerSupabase();

  // Caminho rápido: 1 round-trip via função SQL.
  const { error: rpcError } = await supabase.rpc("reorder_defect_cards", {
    p_board_id: boardId,
    p_ordered_ids: orderedCardIds,
  });

  if (!rpcError) {
    // Não revalida a página inteira — a UI já está otimista e instantânea.
    return;
  }

  const rpcMissing =
    /reorder_defect_cards/i.test(rpcError.message) ||
    /Could not find the function/i.test(rpcError.message) ||
    rpcError.code === "PGRST202";

  if (!rpcMissing) {
    if (/ordem/i.test(rpcError.message) || /column/i.test(rpcError.message) || rpcError.code === "42703") {
      throw new Error(
        "Coluna ordem ausente. Execute a migration 010_add_card_ordem.sql no Supabase.",
      );
    }
    throw new Error(rpcError.message);
  }

  // Fallback: updates em paralelo (sem travar a UI com dezenas de awaits sequenciais).
  const results = await Promise.all(
    orderedCardIds.map((id, index) =>
      supabase
        .from("defect_cards")
        .update({ ordem: index })
        .eq("id", id)
        .eq("board_id", boardId)
        .select("id,ordem")
        .maybeSingle(),
    ),
  );

  const failed = results.find((r) => r.error || !r.data);
  if (failed?.error) {
    if (
      /ordem/i.test(failed.error.message) ||
      /column/i.test(failed.error.message) ||
      failed.error.code === "42703"
    ) {
      throw new Error(
        "Coluna ordem ausente. Execute a migration 010_add_card_ordem.sql no Supabase.",
      );
    }
    throw new Error(failed.error.message);
  }
  if (failed && !failed.data) {
    throw new Error("Não foi possível confirmar a nova ordem dos cards.");
  }

  // Empurra filtrados para o final (best-effort, sem bloquear).
  void (async () => {
    const { data: rest } = await supabase
      .from("defect_cards")
      .select("id")
      .eq("board_id", boardId)
      .eq("column_id", columnId)
      .order("ordem", { ascending: true });
    if (!rest?.length) return;
    const listed = new Set(orderedCardIds);
    let next = orderedCardIds.length;
    await Promise.all(
      rest
        .filter((row) => !listed.has(row.id))
        .map((row) => {
          const ordem = next++;
          return supabase.from("defect_cards").update({ ordem }).eq("id", row.id).eq("board_id", boardId);
        }),
    );
  })();
}

export async function moveCardToColumn(
  cardId: string,
  boardId: string,
  newColumnId: string,
  _previousColumnId?: string,
  destinationIndex = 0,
) {
  const supabase = createServerSupabase();
  const { data: col } = await supabase
    .from("kanban_columns")
    .select("status_ref,titulo")
    .eq("id", newColumnId)
    .single();
  const statusFromCol = parseStatusRef(col?.status_ref ?? null) ?? parseStatusRef(col?.titulo ?? null);

  const patch: Record<string, unknown> = {
    column_id: newColumnId,
  };
  if (typeof destinationIndex === "number") {
    patch.ordem = destinationIndex;
  }
  if (statusFromCol) patch.status = statusFromCol;

  let { error } = await supabase.from("defect_cards").update(patch).eq("id", cardId);
  if (
    error &&
    (/ordem/i.test(error.message) || /column/i.test(error.message) || error.code === "42703")
  ) {
    const { column_id, status } = patch as { column_id: string; status?: string };
    const fallback: Record<string, unknown> = { column_id };
    if (status) fallback.status = status;
    const retry = await supabase.from("defect_cards").update(fallback).eq("id", cardId);
    error = retry.error;
  }
  if (error) throw new Error(error.message);
  // Sem revalidatePath: o board já atualiza otimista no cliente (evita "Rendering" longo).
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
