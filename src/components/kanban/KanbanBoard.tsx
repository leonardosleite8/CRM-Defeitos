"use client";

import { useCallback, useMemo, useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import type { BoardPayload, DefectCardRow } from "@/lib/types/db";
import { KanbanColumn } from "./KanbanColumn";
import { BoardTitleEditor } from "./BoardTitleEditor";
import { moveCardToColumn, deleteBoard } from "@/app/actions/defeitos";
import { DEFECT_SEVERIDADE, MODELOS_PRODUTO } from "@/lib/constants";
import { Plus, Filter, Trash2 } from "lucide-react";
import { CardDetailModal } from "@/components/defects/CardDetailModal";
import { NewDefectModal } from "@/components/defects/NewDefectModal";

function filterCards(cards: DefectCardRow[], modelo: string, severidade: string): DefectCardRow[] {
  return cards.filter((c) => {
    if (modelo && !(c.modelo_produto ?? []).includes(modelo)) return false;
    if (severidade && c.severidade !== severidade) return false;
    return true;
  });
}

export function KanbanBoard({ boardId, initial }: { boardId: string; initial: BoardPayload }) {
  const router = useRouter();
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null);
  const [filterModelo, setFilterModelo] = useState("");
  const [filterSev, setFilterSev] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterCards(initial.cards, filterModelo, filterSev),
    [initial.cards, filterModelo, filterSev],
  );

  const byColumn = useCallback(
    (colId: string) => filtered.filter((c) => c.column_id === colId),
    [filtered],
  );

  const onDragEnd = async (result: DropResult) => {
    setErr(null);
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (destination.droppableId === source.droppableId) return;
    setBusy(true);
    try {
      await moveCardToColumn(draggableId, boardId, destination.droppableId, source.droppableId);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao mover card");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirm("Excluir todo este quadro e os cards? Esta aÃ§Ã£o nÃ£o pode ser desfeita.")) return;
    setErr(null);
    try {
      await deleteBoard(boardId);
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
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
            Arraste os cards pela faixa &quot;Arrastar&quot; entre as colunas. Toque no card para abrir detalhes.
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
            onClick={handleDeleteBoard}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Excluir quadro
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-end md:gap-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtros rÃ¡pidos</span>
        </div>
        <div className="flex flex-1 flex-wrap gap-3">
          <label className="flex min-w-[160px] flex-1 flex-col text-xs font-medium text-slate-600">
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
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {initial.columns.map((col) => (
            <KanbanColumn key={col.id} column={col} cards={byColumn(col.id)} onOpenCard={setDetailCardId} />
          ))}
        </div>
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

