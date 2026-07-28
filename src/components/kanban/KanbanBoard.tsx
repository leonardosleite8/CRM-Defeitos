"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import type { BoardPayload, DefectCardRow } from "@/lib/types/db";
import { KanbanColumn } from "./KanbanColumn";
import { BoardTitleEditor } from "./BoardTitleEditor";
import {
  moveCardToColumn,
  deleteBoard,
  createColumn,
  renameColumn,
  deleteColumn,
  reorderColumns,
  reorderCardsInColumn,
} from "@/app/actions/defeitos";
import {
  DEFECT_ORIGEM,
  DEFECT_SEVERIDADE,
  DEFECT_STATUS,
  LINHAS,
  MODELOS_PRODUTO,
} from "@/lib/constants";
import { Plus, Filter, Trash2, Columns3, Search } from "lucide-react";
import { CardDetailModal } from "@/components/defects/CardDetailModal";
import { NewDefectModal } from "@/components/defects/NewDefectModal";

type BoardFilters = {
  modelo: string;
  linha: string;
  origem: string;
  setor: string;
  status: string;
  severidade: string;
  q: string;
};

function filterCards(cards: DefectCardRow[], f: BoardFilters): DefectCardRow[] {
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return cards.filter((c) => {
    if (f.modelo && !(c.modelo_produto ?? []).includes(f.modelo)) return false;
    if (f.linha && !(c.linha ?? []).includes(f.linha)) return false;
    if (f.origem && c.origem !== f.origem) return false;
    if (f.setor && c.setor_responsavel !== f.setor) return false;
    if (f.status && c.status !== f.status) return false;
    if (f.severidade && c.severidade !== f.severidade) return false;
    if (words.length) {
      const hay = [
        c.titulo,
        c.descricao,
        c.solucao,
        c.responsavel,
        c.setor_responsavel,
        c.origem,
        c.status,
        c.severidade,
        ...(c.modelo_produto ?? []),
        ...(c.linha ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

function sortByOrdem(cards: DefectCardRow[]): DefectCardRow[] {
  return [...cards].sort((a, b) => {
    const ao = Number.isFinite(Number(a.ordem)) ? Number(a.ordem) : 0;
    const bo = Number.isFinite(Number(b.ordem)) ? Number(b.ordem) : 0;
    if (ao !== bo) return ao - bo;
    return (b.data_criacao || "").localeCompare(a.data_criacao || "") || a.id.localeCompare(b.id);
  });
}

/** Reaplica a ordem dos cards visíveis preservando os filtrados fora da lista. */
function applyFilteredOrder(
  allInColumn: DefectCardRow[],
  nextVisibleIds: string[],
): DefectCardRow[] {
  const visibleSet = new Set(nextVisibleIds);
  const queue = [...nextVisibleIds];
  const orderedIds: string[] = [];
  for (const card of sortByOrdem(allInColumn)) {
    if (visibleSet.has(card.id)) {
      const next = queue.shift();
      if (next) orderedIds.push(next);
    } else {
      orderedIds.push(card.id);
    }
  }
  const byId = new Map(allInColumn.map((c) => [c.id, c]));
  return orderedIds.map((id, index) => {
    const card = byId.get(id)!;
    return { ...card, ordem: index };
  });
}

export function KanbanBoard({ boardId, initial }: { boardId: string; initial: BoardPayload }) {
  const router = useRouter();
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null);
  const [filterModelo, setFilterModelo] = useState("");
  const [filterLinha, setFilterLinha] = useState("");
  const [filterOrigem, setFilterOrigem] = useState("");
  const [filterSetor, setFilterSetor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSev, setFilterSev] = useState("");
  const [filterQ, setFilterQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cards, setCards] = useState(initial.cards);

  // Só substitui a lista local quando cards são criados/excluídos.
  // Se for o mesmo conjunto, preserva column_id/ordem definidos pelo usuário (evita “pulo” de volta).
  useEffect(() => {
    setCards((prev) => {
      const sameIds =
        prev.length === initial.cards.length &&
        prev.every((c) => initial.cards.some((s) => s.id === c.id));

      if (!sameIds) return initial.cards;

      const serverById = new Map(initial.cards.map((c) => [c.id, c]));
      return prev.map((local) => {
        const server = serverById.get(local.id);
        if (!server) return local;
        return {
          ...server,
          column_id: local.column_id,
          ordem: local.ordem,
        };
      });
    });
  }, [initial.cards]);

  const filtered = useMemo(
    () =>
      filterCards(cards, {
        modelo: filterModelo,
        linha: filterLinha,
        origem: filterOrigem,
        setor: filterSetor,
        status: filterStatus,
        severidade: filterSev,
        q: filterQ,
      }),
    [cards, filterModelo, filterLinha, filterOrigem, filterSetor, filterStatus, filterSev, filterQ],
  );

  const byColumn = useCallback(
    (colId: string) => sortByOrdem(filtered.filter((c) => c.column_id === colId)),
    [filtered],
  );

  const onDragEnd = async (result: DropResult) => {
    setErr(null);
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (type === "COLUMN") {
      const ordered = [...initial.columns];
      const [moved] = ordered.splice(source.index, 1);
      ordered.splice(destination.index, 0, moved);
      setBusy(true);
      try {
        await reorderColumns(
          boardId,
          ordered.map((c) => c.id),
        );
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao reordenar colunas");
      } finally {
        setBusy(false);
      }
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    if (sourceColId === destColId) {
      const visible = byColumn(sourceColId);
      const nextVisible = [...visible];
      const [moved] = nextVisible.splice(source.index, 1);
      if (!moved || moved.id !== draggableId) return;
      nextVisible.splice(destination.index, 0, moved);

      const allInColumn = cards.filter((c) => c.column_id === sourceColId);
      const reordered = applyFilteredOrder(
        allInColumn,
        nextVisible.map((c) => c.id),
      );
      const reorderedById = new Map(reordered.map((c) => [c.id, c]));
      // UI instantânea — não trava com busy/Rendering
      setCards((prev) => prev.map((c) => reorderedById.get(c.id) ?? c));

      void reorderCardsInColumn(
        boardId,
        sourceColId,
        reordered.map((c) => c.id),
      ).catch((e) => {
        setCards(initial.cards);
        const msg = e instanceof Error ? e.message : "Erro ao reordenar cards";
        if (/ordem/i.test(msg) || /column/i.test(msg) || /010_add_card_ordem/i.test(msg)) {
          setErr(
            "Não foi possível salvar a ordem. Execute no Supabase a migration 010_add_card_ordem.sql e tente de novo.",
          );
        } else {
          setErr(msg);
        }
      });
      return;
    }

    const sourceVisible = byColumn(sourceColId);
    const destVisible = byColumn(destColId);
    const moving = sourceVisible.find((c) => c.id === draggableId);
    if (!moving) return;

    const nextSourceVisible = sourceVisible.filter((c) => c.id !== draggableId);
    const nextDestVisible = [...destVisible];
    nextDestVisible.splice(destination.index, 0, { ...moving, column_id: destColId });

    const sourceAll = cards.filter((c) => c.column_id === sourceColId && c.id !== draggableId);
    const destAll = cards.filter((c) => c.column_id === destColId && c.id !== draggableId);
    const nextSource = applyFilteredOrder(
      sourceAll,
      nextSourceVisible.map((c) => c.id),
    );
    const nextDest = applyFilteredOrder(
      [...destAll, { ...moving, column_id: destColId }],
      nextDestVisible.map((c) => c.id),
    );
    const patchById = new Map([...nextSource, ...nextDest].map((c) => [c.id, c]));

    setCards((prev) =>
      prev.map((c) => {
        const patched = patchById.get(c.id);
        return patched ?? c;
      }),
    );

    void (async () => {
      try {
        await moveCardToColumn(draggableId, boardId, destColId, sourceColId, destination.index);
        await Promise.all([
          reorderCardsInColumn(
            boardId,
            sourceColId,
            nextSource.map((c) => c.id),
          ),
          reorderCardsInColumn(
            boardId,
            destColId,
            nextDest.map((c) => c.id),
          ),
        ]);
      } catch (e) {
        setCards(initial.cards);
        const msg = e instanceof Error ? e.message : "Erro ao mover card";
        if (/ordem/i.test(msg) || /column/i.test(msg) || /010_add_card_ordem/i.test(msg)) {
          setErr(
            "Não foi possível salvar a ordem. Execute no Supabase a migration 010_add_card_ordem.sql e tente de novo.",
          );
        } else {
          setErr(msg);
        }
      }
    })();
  };

  const handleDeleteBoard = async () => {
    if (!confirm("Excluir todo este quadro e os cards? Esta ação não pode ser desfeita.")) return;
    setErr(null);
    try {
      await deleteBoard(boardId);
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    }
  };

  const handleCreateColumn = async () => {
    setErr(null);
    try {
      await createColumn(boardId, "Nova coluna");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao criar coluna");
    }
  };

  const handleRenameColumn = async (columnId: string, nextName: string) => {
    setErr(null);
    try {
      await renameColumn(columnId, boardId, nextName);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao editar coluna");
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const ok = confirm("Deseja excluir esta coluna? (só é possível se estiver vazia)");
    if (!ok) return;
    setErr(null);
    try {
      await deleteColumn(columnId, boardId);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao excluir coluna");
    }
  };

  const firstColumnId = initial.columns[0]?.id;

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{err}</div>
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <BoardTitleEditor boardId={boardId} initialTitulo={initial.board.titulo} />
          <p className="text-sm text-slate-600">
            Arraste os cards pela faixa &quot;Arrastar&quot; para reordenar na coluna ou mover entre
            colunas. Toque no card para abrir detalhes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !firstColumnId}
            onClick={() => setNewCardColumnId(firstColumnId ?? null)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Novo card
          </button>
          <button
            type="button"
            onClick={() => void handleCreateColumn()}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100"
          >
            <Columns3 className="h-4 w-4" />
            Nova coluna
          </button>
          <button
            type="button"
            onClick={handleDeleteBoard}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Excluir quadro
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros</span>
        </div>
        <div className="flex flex-1 flex-wrap gap-3">
          <label className="flex min-w-[140px] flex-1 flex-col text-xs font-medium text-slate-600">
            Modelo
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={filterModelo}
              onChange={(e) => setFilterModelo(e.target.value)}
            >
              <option value="">Todos</option>
              {MODELOS_PRODUTO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col text-xs font-medium text-slate-600">
            Linha
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={filterLinha}
              onChange={(e) => setFilterLinha(e.target.value)}
            >
              <option value="">Todas</option>
              {LINHAS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[120px] flex-1 flex-col text-xs font-medium text-slate-600">
            Origem
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={filterOrigem}
              onChange={(e) => setFilterOrigem(e.target.value)}
            >
              <option value="">Todas</option>
              {DEFECT_ORIGEM.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col text-xs font-medium text-slate-600">
            Setor responsável
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={filterSetor}
              onChange={(e) => setFilterSetor(e.target.value)}
            >
              <option value="">Todos</option>
              {DEFECT_ORIGEM.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[120px] flex-1 flex-col text-xs font-medium text-slate-600">
            Status
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Todos</option>
              {DEFECT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[120px] flex-1 flex-col text-xs font-medium text-slate-600">
            Severidade
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={filterSev}
              onChange={(e) => setFilterSev(e.target.value)}
            >
              <option value="">Todas</option>
              {DEFECT_SEVERIDADE.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="relative block text-xs font-medium text-slate-600">
          Busca livre
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="Buscar por palavras…"
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm"
            />
          </span>
        </label>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board-columns" type="COLUMN" direction="horizontal">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-4 overflow-x-auto pb-4">
              {initial.columns.map((col, index) => (
                <Draggable key={col.id} draggableId={`column-${col.id}`} index={index}>
                  {(dragProvided) => (
                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                      <KanbanColumn
                        column={col}
                        cards={byColumn(col.id)}
                        onOpenCard={setDetailCardId}
                        onRenameColumn={handleRenameColumn}
                        onDeleteColumn={handleDeleteColumn}
                        busy={busy}
                        columnDragHandleProps={dragProvided.dragHandleProps}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <CardDetailModal
        open={!!detailCardId}
        cardId={detailCardId}
        boardId={boardId}
        onClose={() => setDetailCardId(null)}
      />

      <NewDefectModal
        open={!!newCardColumnId}
        boardId={boardId}
        columnId={newCardColumnId}
        columns={initial.columns}
        onClose={() => setNewCardColumnId(null)}
      />
    </div>
  );
}
