"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { DefectOrigem, DefectSeveridade, DefectStatus } from "@/lib/constants";
import { getCardDetail, ensureDefectCardCodigos } from "@/lib/queries/boards";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/getSession";
import { assertCanMutate } from "@/lib/auth/guard";
import { writeAuditLog } from "@/lib/auth/users";
import { buildFieldDiffDetail } from "@/lib/auditLabels";
import { formatCardCodigo } from "@/lib/cardCodigo";

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

function cardLabel(row: { codigo?: number | null; titulo?: string | null; id?: string }) {
  const code = formatCardCodigo(row.codigo) || (row.id ? row.id.slice(0, 8) : "?");
  return `${code} — ${row.titulo || "sem título"}`;
}

/** Menor ordem da coluna − 1 (card no topo). */
async function nextTopOrdem(columnId: string): Promise<number | null> {
  const supabase = createServerSupabase();
  const { data: minRow, error } = await supabase
    .from("defect_cards")
    .select("ordem")
    .eq("column_id", columnId)
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (/ordem/i.test(error.message) || /column/i.test(error.message) || error.code === "42703") {
      return null;
    }
    throw new Error(error.message);
  }
  const minOrdem = Number(minRow?.ordem);
  return Number.isFinite(minOrdem) ? minOrdem - 1 : 0;
}

async function findConcluidoColumn(boardId: string) {
  const supabase = createServerSupabase();
  const { data: cols, error } = await supabase
    .from("kanban_columns")
    .select("id,titulo,status_ref,ordem")
    .eq("board_id", boardId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  const list = cols ?? [];
  const byRef = list.find(
    (c) =>
      parseStatusRef(c.status_ref ?? null) === "Concluído" ||
      parseStatusRef(c.titulo ?? null) === "Concluído" ||
      /^conclu[ií]do$/i.test((c.titulo ?? "").trim()),
  );
  return byRef ?? list[list.length - 1] ?? null;
}

export async function updateBoardTitulo(boardId: string, titulo: string) {
  await assertCanMutate();
  const supabase = createServerSupabase();
  const t = titulo.trim();
  if (!t) throw new Error("Título do quadro não pode ser vazio.");
  const { error } = await supabase.from("boards").update({ titulo: t }).eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function createBoardWithDefaults(titulo: string) {
  await assertCanMutate();
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
    status_ref: null,
  }));
  const { error: e2 } = await supabase.from("kanban_columns").insert(cols);
  if (e2) throw new Error(e2.message);
  revalidatePath("/");
  return board.id as string;
}

export async function deleteBoard(boardId: string) {
  await assertCanMutate();
  const supabase = createServerSupabase();
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function createColumn(boardId: string, titulo: string) {
  await assertCanMutate();
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
  await assertCanMutate();
  const supabase = createServerSupabase();
  const t = titulo.trim();
  if (!t) throw new Error("Nome da coluna não pode ser vazio.");
  const { error } = await supabase.from("kanban_columns").update({ titulo: t }).eq("id", columnId);
  if (error) throw new Error(error.message);
  revalidateBoard(boardId);
}

export async function deleteColumn(columnId: string, boardId: string) {
  await assertCanMutate();
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
  await assertCanMutate();
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
  await assertCanMutate();
  if (!input.modeloProduto.length) throw new Error("Selecione ao menos um modelo de produto.");
  if (!input.linha.length) throw new Error("Selecione ao menos uma linha.");

  const supabase = createServerSupabase();
  const session = await getSession();
  const { data: col } = await supabase
    .from("kanban_columns")
    .select("status_ref,titulo")
    .eq("id", input.columnId)
    .single();
  const statusFromCol = parseStatusRef(col?.status_ref ?? null) ?? parseStatusRef(col?.titulo ?? null);
  const status: DefectStatus = statusFromCol ?? "Aguardando";

  // Próximo código sequencial (exibido como CD0001).
  let nextCodigo: number | null = null;
  {
    const { data: maxRow, error: maxErr } = await supabase
      .from("defect_cards")
      .select("codigo")
      .order("codigo", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!maxErr) {
      const maxN = Number(maxRow?.codigo);
      nextCodigo = Number.isFinite(maxN) && maxN > 0 ? maxN + 1 : 1;
    }
  }

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
  if (nextCodigo != null) {
    baseRow.codigo = nextCodigo;
  }

  const topOrdem = await nextTopOrdem(input.columnId);
  let insertPayload = { ...baseRow };
  if (topOrdem != null) {
    insertPayload = { ...baseRow, ordem: topOrdem };
  }

  let card: { id: string; codigo?: number | null; titulo?: string | null } | null = null;
  let error: { message: string; code?: string } | null = null;

  {
    const first = await supabase
      .from("defect_cards")
      .insert(insertPayload)
      .select("id,codigo,titulo")
      .single();
    card = first.data;
    error = first.error;
  }

  if (
    error &&
    (/ordem/i.test(error.message) || /column/i.test(error.message) || error.code === "42703")
  ) {
    const { ordem: _o, ...withoutOrdem } = insertPayload as Record<string, unknown> & { ordem?: unknown };
    void _o;
    const retry = await supabase.from("defect_cards").insert(withoutOrdem).select("id,codigo,titulo").single();
    card = retry.data;
    error = retry.error;
  }

  // Sem coluna codigo ainda: tenta sem ela.
  if (error && (/codigo/i.test(error.message) || error.code === "42703")) {
    const { codigo: _c, ...withoutCodigo } = insertPayload as Record<string, unknown> & { codigo?: unknown };
    void _c;
    const retry = await supabase.from("defect_cards").insert(withoutCodigo).select("id,titulo").single();
    card = retry.data;
    error = retry.error;
  }

  if (error || !card) throw new Error(error?.message ?? "Falha ao criar card");

  // Se inseriu sem codigo, tenta preencher agora.
  if (!card.codigo || Number(card.codigo) <= 0) {
    await ensureDefectCardCodigos();
    const { data: refreshed } = await supabase
      .from("defect_cards")
      .select("id,codigo,titulo")
      .eq("id", card.id)
      .maybeSingle();
    if (refreshed) card = refreshed;
  }

  await writeAuditLog({
    user: session,
    action: "card_create",
    detail: cardLabel(card),
  });

  revalidateBoard(input.boardId);
  return card.id as string;
}

export async function updateDefectCardMedia(cardId: string, boardId: string, mediaUrls: string[]) {
  await assertCanMutate();
  const supabase = createServerSupabase();
  const session = await getSession();
  const { data: before } = await supabase
    .from("defect_cards")
    .select("codigo,titulo,media_urls")
    .eq("id", cardId)
    .maybeSingle();
  const { error } = await supabase.from("defect_cards").update({ media_urls: mediaUrls }).eq("id", cardId);
  if (error) throw new Error(error.message);
  const diff = buildFieldDiffDetail(
    { media_urls: before?.media_urls },
    { media_urls: mediaUrls },
  );
  await writeAuditLog({
    user: session,
    action: "card_update",
    detail: `${cardLabel(before ?? { id: cardId })}${diff ? ` — ${diff}` : ""}`,
  });
  revalidateBoard(boardId);
}

export async function reorderCardsInColumn(
  boardId: string,
  columnId: string,
  orderedCardIds: string[],
) {
  await assertCanMutate();
  if (!orderedCardIds.length) return;
  const supabase = createServerSupabase();

  const { error: rpcError } = await supabase.rpc("reorder_defect_cards", {
    p_board_id: boardId,
    p_ordered_ids: orderedCardIds,
  });

  if (!rpcError) {
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
  previousColumnId?: string,
  /** Ignorado: mudança de coluna sempre vai ao topo. */
  _destinationIndex = 0,
) {
  const session = await assertCanMutate();
  const supabase = createServerSupabase();

  const { data: before } = await supabase
    .from("defect_cards")
    .select("id,codigo,titulo,column_id,status")
    .eq("id", cardId)
    .maybeSingle();

  const { data: col } = await supabase
    .from("kanban_columns")
    .select("id,status_ref,titulo")
    .eq("id", newColumnId)
    .single();
  const statusFromCol = parseStatusRef(col?.status_ref ?? null) ?? parseStatusRef(col?.titulo ?? null);

  let fromTitle = previousColumnId ?? before?.column_id ?? "?";
  if (previousColumnId || before?.column_id) {
    const { data: fromCol } = await supabase
      .from("kanban_columns")
      .select("titulo")
      .eq("id", previousColumnId ?? before?.column_id)
      .maybeSingle();
    if (fromCol?.titulo) fromTitle = fromCol.titulo;
  }

  const topOrdem = await nextTopOrdem(newColumnId);
  const patch: Record<string, unknown> = {
    column_id: newColumnId,
  };
  if (topOrdem != null) patch.ordem = topOrdem;
  if (statusFromCol) patch.status = statusFromCol;
  if (statusFromCol === "Concluído") {
    patch.data_conclusao = new Date().toISOString();
  }

  let { error } = await supabase.from("defect_cards").update(patch).eq("id", cardId);
  if (
    error &&
    (/ordem/i.test(error.message) || /column/i.test(error.message) || error.code === "42703")
  ) {
    const { column_id, status, data_conclusao } = patch as {
      column_id: string;
      status?: string;
      data_conclusao?: string;
    };
    const fallback: Record<string, unknown> = { column_id };
    if (status) fallback.status = status;
    if (data_conclusao) fallback.data_conclusao = data_conclusao;
    const retry = await supabase.from("defect_cards").update(fallback).eq("id", cardId);
    error = retry.error;
  }
  if (error) throw new Error(error.message);

  await writeAuditLog({
    user: session,
    action: "card_move",
    detail: `${cardLabel(before ?? { id: cardId })}: "${fromTitle}" → "${col?.titulo ?? newColumnId}"`,
  });
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
  const session = await assertCanMutate();
  const supabase = createServerSupabase();

  const { data: before, error: beforeErr } = await supabase
    .from("defect_cards")
    .select("*")
    .eq("id", cardId)
    .single();
  if (beforeErr || !before) throw new Error(beforeErr?.message ?? "Card não encontrado");

  const patch: Record<string, unknown> = { ...fields };
  if (fields.status === "Concluído" && !before.data_conclusao) {
    patch.data_conclusao = new Date().toISOString();
  }

  const { error } = await supabase.from("defect_cards").update(patch).eq("id", cardId);
  if (error) throw new Error(error.message);

  const diff = buildFieldDiffDetail(before as Record<string, unknown>, patch);
  if (diff) {
    await writeAuditLog({
      user: session,
      action: "card_update",
      detail: `${cardLabel(before)} — ${diff}`,
    });
  }

  // Status Concluído → move para coluna Concluído (topo).
  if (fields.status === "Concluído" && before.column_id) {
    const concluidoCol = await findConcluidoColumn(boardId);
    if (concluidoCol && concluidoCol.id !== before.column_id) {
      await moveCardToColumn(cardId, boardId, concluidoCol.id, before.column_id, 0);
    }
  }

  revalidateBoard(boardId);
}

export async function deleteDefectCard(cardId: string, boardId: string) {
  const session = await assertCanMutate();
  const supabase = createServerSupabase();
  const { data: before } = await supabase
    .from("defect_cards")
    .select("id,codigo,titulo")
    .eq("id", cardId)
    .maybeSingle();
  const { error } = await supabase.from("defect_cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    user: session,
    action: "card_delete",
    detail: cardLabel(before ?? { id: cardId }),
  });
  revalidatePath(`/quadros/${boardId}`);
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function addComment(cardId: string, boardId: string, texto: string, _autorIgnored?: string) {
  const session = await assertCanMutate();
  const supabase = createServerSupabase();
  if (!session) throw new Error("Faça login para comentar.");
  const autor = session.name.trim() || session.email;

  const { data: card } = await supabase
    .from("defect_cards")
    .select("codigo,titulo")
    .eq("id", cardId)
    .maybeSingle();

  const { error } = await supabase.from("defect_comments").insert({
    card_id: cardId,
    texto,
    autor,
  });
  if (error) throw new Error(error.message);

  await writeAuditLog({
    user: session,
    action: "comment_create",
    detail: `${cardLabel(card ?? { id: cardId })} — autor: ${autor}`,
  });
  revalidateBoard(boardId);
}

export async function updateComment(
  commentId: string,
  cardId: string,
  boardId: string,
  texto: string,
) {
  const session = await assertCanMutate();
  const supabase = createServerSupabase();

  const { data: existing, error: fetchErr } = await supabase
    .from("defect_comments")
    .select("*")
    .eq("id", commentId)
    .eq("card_id", cardId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!existing) throw new Error("Comentário não encontrado.");

  const isAuthor = (existing.autor || "").trim() === session.name.trim();
  const isAdmin = session.role === "admin";
  if (!isAuthor && !isAdmin) {
    throw new Error("Você só pode editar seus próprios comentários.");
  }

  const plain = texto.replace(/<[^>]+>/g, "").trim();
  if (!plain) throw new Error("Comentário vazio.");

  const { error } = await supabase
    .from("defect_comments")
    .update({ texto, updated_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) {
    if (/updated_at/i.test(error.message) || error.code === "42703") {
      const retry = await supabase.from("defect_comments").update({ texto }).eq("id", commentId);
      if (retry.error) throw new Error(retry.error.message);
    } else {
      throw new Error(error.message);
    }
  }

  const { data: card } = await supabase
    .from("defect_cards")
    .select("codigo,titulo")
    .eq("id", cardId)
    .maybeSingle();

  await writeAuditLog({
    user: session,
    action: "comment_update",
    detail: cardLabel(card ?? { id: cardId }),
  });
  revalidateBoard(boardId);
}

export async function fetchCardDetail(cardId: string) {
  return getCardDetail(cardId);
}
