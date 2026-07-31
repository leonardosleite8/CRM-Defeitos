"use client";

import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import type { DefectCardRow, KanbanColumnRow } from "@/lib/types/db";
import { DefectCardPreview } from "./DefectCardPreview";
import { Pencil, Trash2, Check, X, GripHorizontal } from "lucide-react";

export function KanbanColumn({
  column,
  cards,
  onOpenCard,
  onRenameColumn,
  onDeleteColumn,
  busy = false,
  columnDragHandleProps,
}: {
  column: KanbanColumnRow;
  cards: DefectCardRow[];
  onOpenCard: (id: string) => void;
  onRenameColumn: (columnId: string, nextName: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => void;
  busy?: boolean;
  columnDragHandleProps?: DraggableProvidedDragHandleProps | null;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.titulo);

  const saveName = async () => {
    const next = name.trim();
    if (!next) return;
    if (next === column.titulo) {
      setEditing(false);
      return;
    }
    await onRenameColumn(column.id, next);
    setEditing(false);
  };

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Arrastar coluna"
            {...(columnDragHandleProps ?? {})}
          >
            <GripHorizontal className="h-4 w-4 shrink-0" />
          </button>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveName();
                }
                if (e.key === "Escape") {
                  setName(column.titulo);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
              autoFocus
            />
          ) : (
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-slate-900">{column.titulo}</h2>
              <span
                className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 px-1.5 text-[11px] font-semibold tabular-nums text-slate-700"
                title={`${cards.length} card(s)`}
              >
                {cards.length}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                type="button"
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                onClick={() => void saveName()}
                title="Salvar nome"
                disabled={busy}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setName(column.titulo);
                  setEditing(false);
                }}
                title="Cancelar edição"
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setEditing(true)}
              title="Editar nome da coluna"
              disabled={busy}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => onDeleteColumn(column.id)}
            title="Excluir coluna"
            disabled={busy}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 ${
              snapshot.isDraggingOver ? "bg-blue-50/60" : ""
            }`}
          >
            {cards.map((card, i) => (
              <Draggable key={card.id} draggableId={card.id} index={i}>
                {(dragProvided) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="rounded-lg">
                    <div
                      {...dragProvided.dragHandleProps}
                      className="mb-1 flex cursor-grab items-center gap-1 rounded border border-dashed border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500 hover:bg-slate-100"
                    >
                      Arrastar
                    </div>
                    <DefectCardPreview card={card} onOpen={() => onOpenCard(card.id)} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
