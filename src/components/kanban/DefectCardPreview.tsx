"use client";

import type { DefectCardRow } from "@/lib/types/db";
import { formatCardCodigo } from "@/lib/cardCodigo";
import { Paperclip } from "lucide-react";

const sevBadge: Record<string, string> = {
  Baixa: "bg-slate-200 text-slate-800",
  Média: "bg-amber-100 text-amber-900",
  Alta: "bg-orange-100 text-orange-900",
  Crítica: "bg-red-100 text-red-900",
};

export function DefectCardPreview({
  card,
  onOpen,
}: {
  card: DefectCardRow;
  onOpen: () => void;
}) {
  const concluded = card.status === "Concluído";
  const critical = card.severidade === "Crítica";
  const hasMedia = (card.media_urls?.length ?? 0) > 0;
  const modelos = (card.modelo_produto ?? []).join(", ") || "—";
  const linhas = (card.linha ?? []).join(", ") || "—";
  const codigoLabel = formatCardCodigo(card.codigo);

  const cardTone = concluded
    ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300"
    : critical
      ? "border-red-600 ring-1 ring-red-500"
      : "border-slate-200 bg-white";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`relative rounded-lg border p-3 pr-8 shadow-sm transition hover:shadow-md ${cardTone}`}
    >
      {hasMedia ? (
        <span className="absolute right-2 top-2 text-amber-400" title="Anexos">
          <Paperclip className="h-4 w-4" strokeWidth={2.5} />
        </span>
      ) : null}
      {codigoLabel ? (
        <div className="mb-2">
          <span className="inline-flex rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-slate-800">
            {codigoLabel}
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${sevBadge[card.severidade]}`}>
          {card.severidade}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] ${concluded ? "bg-emerald-200 text-emerald-900" : "bg-slate-100 text-slate-700"}`}>
          {card.status}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{card.titulo}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{card.descricao ?? "—"}</p>
      <p className="mt-2 text-[11px] text-slate-500">
        {modelos} · {linhas}
      </p>
      {card.origem ? <p className="mt-1 text-[11px] text-slate-600">Origem: {card.origem}</p> : null}
      {card.responsavel ? (
        <p className="mt-1 text-[11px] font-medium text-slate-700">Resp.: {card.responsavel}</p>
      ) : null}
    </div>
  );
}
