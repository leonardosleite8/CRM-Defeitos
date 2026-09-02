import { createServerSupabase } from "@/lib/supabase/server";
import type { BoardPayload, DefectCardRow, KanbanColumnRow } from "@/lib/types/db";
import type { DefectSeveridade, DefectOrigem } from "@/lib/constants";
import { periodBoundsSaoPaulo } from "@/lib/date";

function tryParseJsonArray(s: string): string[] | null {
  const t = s.trim();
  if (!t.startsWith("[") || !t.endsWith("]")) return null;
  try {
    const p = JSON.parse(t) as unknown;
    if (!Array.isArray(p)) return null;
    return p.flatMap((x): string[] => {
      if (typeof x === "string") {
        const inner = tryParseJsonArray(x);
        if (inner) return inner;
        return x ? [x] : [];
      }
      return x != null ? [String(x)] : [];
    });
  } catch {
    return null;
  }
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.flatMap((x) => {
      if (typeof x === "string") {
        const nested = tryParseJsonArray(x);
        if (nested) return nested;
        return x ? [x] : [];
      }
      return [];
    });
  }
  if (typeof v === "string") {
    const parsed = tryParseJsonArray(v);
    if (parsed) return parsed;
    return v ? [v] : [];
  }
  return [];
}

export function normalizeCard(row: Record<string, unknown>): DefectCardRow {
  const r = row as DefectCardRow;
  const ordemNum = Number(row.ordem);
  const codigoNum = Number(row.codigo);
  return {
    ...r,
    codigo: Number.isFinite(codigoNum) ? codigoNum : 0,
    ordem: Number.isFinite(ordemNum) ? ordemNum : 0,
    solucao: (row.solucao as string | null | undefined) ?? null,
    origem: ((row.origem as DefectOrigem | null | undefined) ?? "Outros") as DefectOrigem,
    setor_responsavel: ((row.setor_responsavel as DefectOrigem | null | undefined) ?? "Outros") as DefectOrigem,
    modelo_produto: asStringArray(row.modelo_produto),
    linha: asStringArray(row.linha),
    media_urls: asStringArray(row.media_urls),
    previsao_conclusao: (row.previsao_conclusao as string | null | undefined) ?? null,
  };
}

/** Garante que todo card tenha codigo sequencial (exibido como CD0001). */
export async function ensureDefectCardCodigos() {
  const supabase = createServerSupabase();

  const { error: rpcError } = await supabase.rpc("ensure_defect_card_codigos");
  if (!rpcError) return;

  // Fallback sem RPC: atribui códigos faltantes em JS.
  const { data: rows, error } = await supabase
    .from("defect_cards")
    .select("id,codigo,data_criacao")
    .order("data_criacao", { ascending: true });

  if (error) {
    if (/codigo/i.test(error.message) || error.code === "42703") {
      console.warn(
        "[ensureDefectCardCodigos] Coluna codigo ausente. Execute a migration 015_ensure_card_codigos.sql no Supabase.",
      );
      return;
    }
    throw new Error(error.message);
  }

  const list = rows ?? [];
  let maxCode = 0;
  for (const row of list) {
    const n = Number(row.codigo);
    if (Number.isFinite(n) && n > maxCode) maxCode = n;
  }

  const missing = list.filter((row) => {
    const n = Number(row.codigo);
    return !Number.isFinite(n) || n <= 0;
  });

  for (const row of missing) {
    maxCode += 1;
    const { error: upErr } = await supabase
      .from("defect_cards")
      .update({ codigo: maxCode })
      .eq("id", row.id);
    if (upErr) {
      if (/codigo/i.test(upErr.message) || upErr.code === "42703") {
        console.warn(
          "[ensureDefectCardCodigos] Coluna codigo ausente. Execute a migration 015_ensure_card_codigos.sql no Supabase.",
        );
        return;
      }
      throw new Error(upErr.message);
    }
  }
}

export async function listBoards() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("boards")
    .select("id,titulo,created_at,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBoardPayload(boardId: string): Promise<BoardPayload> {
  const supabase = createServerSupabase();
  const { data: board, error: e1 } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .single();
  if (e1 || !board) throw new Error(e1?.message ?? "Quadro não encontrado");

  const { data: columns, error: e2 } = await supabase
    .from("kanban_columns")
    .select("*")
    .eq("board_id", boardId)
    .order("ordem", { ascending: true });
  if (e2) throw new Error(e2.message);

  const { data: cardsRaw, error: e3 } = await supabase
    .from("defect_cards")
    .select("*")
    .eq("board_id", boardId)
    .order("ordem", { ascending: true })
    .order("data_criacao", { ascending: false });

  // Fallback enquanto a migration 010 (coluna ordem) não foi aplicada no Supabase.
  let cards = cardsRaw;
  if (e3) {
    const missingOrdem =
      /ordem/i.test(e3.message) || /column/i.test(e3.message) || e3.code === "42703";
    if (!missingOrdem) throw new Error(e3.message);
    const fallback = await supabase.from("defect_cards").select("*").eq("board_id", boardId);
    if (fallback.error) throw new Error(fallback.error.message);
    cards = fallback.data;
  }

  return {
    board,
    columns: (columns ?? []) as KanbanColumnRow[],
    cards: (cards ?? []).map((c) => normalizeCard(c as Record<string, unknown>)),
  };
}

export async function getCardDetail(cardId: string) {
  const supabase = createServerSupabase();
  const { data: cardRow, error: e1 } = await supabase.from("defect_cards").select("*").eq("id", cardId).single();
  if (e1 || !cardRow) throw new Error(e1?.message ?? "Card não encontrado");
  const card = normalizeCard(cardRow as Record<string, unknown>);
  const { data: comments } = await supabase
    .from("defect_comments")
    .select("*")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  return { card, comments: comments ?? [] };
}

export type DashboardFilters = {
  modelo?: string;
  severidade?: DefectSeveridade;
  linha?: string;
  origem?: DefectOrigem;
};

export async function getDashboardData(filters: DashboardFilters = {}) {
  const supabase = createServerSupabase();
  let q = supabase.from("defect_cards").select("*");
  if (filters.modelo) q = q.contains("modelo_produto", [filters.modelo]);
  if (filters.linha) q = q.contains("linha", [filters.linha]);
  if (filters.severidade) q = q.eq("severidade", filters.severidade);
  if (filters.origem) q = q.eq("origem", filters.origem);
  const { data: cards, error } = await q;
  if (error) throw new Error(error.message);
  const list = (cards ?? []).map((c) => normalizeCard(c as Record<string, unknown>));

  const { data: columns } = await supabase.from("kanban_columns").select("id,titulo");
  const etapaByColumnId = new Map((columns ?? []).map((c) => [c.id as string, c.titulo as string]));

  const byModel = new Map<string, number>();
  const bySev = new Map<string, number>();
  let leadSumMs = 0;
  let leadCount = 0;

  for (const c of list) {
    for (const m of c.modelo_produto) {
      byModel.set(m, (byModel.get(m) ?? 0) + 1);
    }
    bySev.set(c.severidade, (bySev.get(c.severidade) ?? 0) + 1);
    if (c.data_conclusao) {
      const start = new Date(c.data_criacao).getTime();
      const end = new Date(c.data_conclusao).getTime();
      if (end > start) {
        leadSumMs += end - start;
        leadCount += 1;
      }
    }
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const leadTimeDays = leadCount ? leadSumMs / leadCount / MS_PER_DAY : null;

  return {
    cards: list,
    etapaByColumnId: Object.fromEntries(etapaByColumnId),
    chartModel: Array.from(byModel.entries()).map(([name, value]) => ({ name, value })),
    chartSev: Array.from(bySev.entries()).map(([name, value]) => ({ name, value })),
    leadTimeDays,
    total: list.length,
  };
}

export type EntregaCardRow = DefectCardRow & {
  quadro_titulo: string;
  etapa: string;
};

export type EntregasPeriodoInput = {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
  boardId?: string;
};

export async function getEntregasNoPeriodo(input: EntregasPeriodoInput) {
  const supabase = createServerSupabase();

  if (
    input.fromYear > input.toYear ||
    (input.fromYear === input.toYear && input.fromMonth > input.toMonth)
  ) {
    throw new Error("O período inicial não pode ser depois do período final.");
  }

  const { startIso, endExclusiveIso } = periodBoundsSaoPaulo(input);

  const cardSelect =
    "id,board_id,column_id,codigo,ordem,titulo,descricao,solucao,origem,setor_responsavel,status,severidade,modelo_produto,linha,media_urls,responsavel,data_criacao,data_atualizacao,data_conclusao,previsao_conclusao";

  let cardsQuery = supabase
    .from("defect_cards")
    .select(cardSelect)
    .not("data_conclusao", "is", null)
    .gte("data_conclusao", startIso)
    .lt("data_conclusao", endExclusiveIso)
    .order("data_conclusao", { ascending: false });

  if (input.boardId) {
    cardsQuery = cardsQuery.eq("board_id", input.boardId);
  }

  let missingQuery = supabase
    .from("defect_cards")
    .select("id", { count: "exact", head: true })
    .eq("status", "Concluído")
    .is("data_conclusao", null);
  if (input.boardId) {
    missingQuery = missingQuery.eq("board_id", input.boardId);
  }

  const [cardsRes, boardsRes, columnsRes, missingRes] = await Promise.all([
    cardsQuery,
    supabase.from("boards").select("id,titulo").order("titulo"),
    supabase.from("kanban_columns").select("id,titulo"),
    missingQuery,
  ]);

  if (cardsRes.error) throw new Error(cardsRes.error.message);
  if (boardsRes.error) throw new Error(boardsRes.error.message);
  if (columnsRes.error) throw new Error(columnsRes.error.message);

  const list = (cardsRes.data ?? []).map((c) => normalizeCard(c as Record<string, unknown>));
  const boards = boardsRes.data ?? [];
  const boardTitleById = new Map(boards.map((b) => [b.id as string, b.titulo as string]));
  const etapaByColumnId = new Map(
    (columnsRes.data ?? []).map((c) => [c.id as string, c.titulo as string]),
  );

  const enriched: EntregaCardRow[] = list.map((c) => ({
    ...c,
    quadro_titulo: boardTitleById.get(c.board_id) ?? "—",
    etapa: etapaByColumnId.get(c.column_id) ?? "—",
  }));

  const byModel = new Map<string, number>();
  const bySev = new Map<string, number>();
  let leadSumMs = 0;
  let leadCount = 0;

  for (const c of enriched) {
    for (const m of c.modelo_produto) {
      byModel.set(m, (byModel.get(m) ?? 0) + 1);
    }
    bySev.set(c.severidade, (bySev.get(c.severidade) ?? 0) + 1);
    if (c.data_conclusao) {
      const start = new Date(c.data_criacao).getTime();
      const end = new Date(c.data_conclusao).getTime();
      if (end > start) {
        leadSumMs += end - start;
        leadCount += 1;
      }
    }
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const leadTimeDays = leadCount ? leadSumMs / leadCount / MS_PER_DAY : null;

  return {
    cards: enriched,
    total: enriched.length,
    leadTimeDays,
    chartModel: Array.from(byModel.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    chartSev: Array.from(bySev.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    boards: boards.map((b) => ({ id: b.id as string, titulo: b.titulo as string })),
    etapaByColumnId: Object.fromEntries(etapaByColumnId),
    missingConclusaoCount: missingRes.count ?? 0,
  };
}

