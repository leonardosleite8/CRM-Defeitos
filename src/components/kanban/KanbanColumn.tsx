"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import type { DefectCardRow, KanbanColumnRow } from "@/lib/types/db";
import { DefectCardPreview } from "./DefectCardPreview";

export function KanbanColumn({
  column,
  cards,
  onOpenCard,
}: {
  column: KanbanColumnRow;
  cards: DefectCardRow[];
  onOpenCard: (id: string) => void;
}) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50/80">
      <div className="border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-900">{column.titulo}</h2>
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
