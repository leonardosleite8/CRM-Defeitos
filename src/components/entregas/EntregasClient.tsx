"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EntregaCardRow } from "@/lib/queries/boards";
import { formatCardCodigo } from "@/lib/cardCodigo";
import { formatDateBR, formatMonthYearPT } from "@/lib/date";
import { CardDetailModal } from "@/components/defects/CardDetailModal";
import { fetchEntregasAction } from "@/app/actions/entregas";
import { Download } from "lucide-react";

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

type BoardOpt = { id: string; titulo: string };

type EntregasData = {
  cards: EntregaCardRow[];
  total: number;
  leadTimeDays: number | null;
  chartModel: { name: string; value: number }[];
  chartSev: { name: string; value: number }[];
  missingConclusaoCount: number;
};

export function EntregasClient({
  boards,
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  boardId,
}: {
  boards: BoardOpt[];
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
  boardId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<EntregasData | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [openBoardId, setOpenBoardId] = useState<string>("");

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    const list: number[] = [];
    for (let i = y + 1; i >= y - 6; i--) list.push(i);
    return list;
  }, []);

  const boardLabel = boardId
    ? boards.find((b) => b.id === boardId)?.titulo ?? "Quadro"
    : "Todos os quadros";

  const periodTitle = `${formatMonthYearPT(fromYear, fromMonth)} até ${formatMonthYearPT(toYear, toMonth)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void fetchEntregasAction({
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      boardId: boardId || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setData({
          cards: res.cards,
          total: res.total,
          leadTimeDays: res.leadTimeDays,
          chartModel: res.chartModel,
          chartSev: res.chartSev,
          missingConclusaoCount: res.missingConclusaoCount,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Erro ao carregar entregas.");
        setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromYear, fromMonth, toYear, toMonth, boardId]);

  const applyFilters = (fd: FormData) => {
    const fy = Number(fd.get("fromYear"));
    const fm = Number(fd.get("fromMonth"));
    const ty = Number(fd.get("toYear"));
    const tm = Number(fd.get("toMonth"));
    const b = String(fd.get("boardId") ?? "");
    const params = new URLSearchParams();
    params.set("de", `${fy}-${String(fm).padStart(2, "0")}`);
    params.set("ate", `${ty}-${String(tm).padStart(2, "0")}`);
    if (b) params.set("quadro", b);
    startTransition(() => {
      router.push(`/entregas?${params.toString()}`);
    });
  };

  const exportExcel = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { buildEntregasWorkbookBuffer, downloadEntregasXlsx } = await import(
        "@/lib/exportEntregasXlsx"
      );
      const buffer = await buildEntregasWorkbookBuffer({
        fromYear,
        fromMonth,
        toYear,
        toMonth,
        boardLabel,
        cards: data.cards,
        total: data.total,
        leadTimeDays: data.leadTimeDays,
        chartModel: data.chartModel,
        chartSev: data.chartSev,
      });
      const de = `${fromYear}-${String(fromMonth).padStart(2, "0")}`;
      const ate = `${toYear}-${String(toMonth).padStart(2, "0")}`;
      downloadEntregasXlsx(buffer, de, ate);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Entregas</h1>
          <p className="text-sm text-slate-600">
            Cards concluídos no período — {periodTitle.toLowerCase()}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportExcel()}
          disabled={exporting || loading || !data}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Gerando Excel…" : "Exportar Excel"}
        </button>
      </div>

      <form
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        action={(fd) => applyFilters(fd)}
      >
        <label className="text-xs font-medium text-slate-600">
          De — mês
          <select
            name="fromMonth"
            defaultValue={fromMonth}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          De — ano
          <select
            name="fromYear"
            defaultValue={fromYear}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Até — mês
          <select
            name="toMonth"
            defaultValue={toMonth}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Até — ano
          <select
            name="toYear"
            defaultValue={toYear}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Quadro
          <select
            name="boardId"
            defaultValue={boardId}
            className="mt-1 block min-w-[12rem] rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Todos</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.titulo}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
        >
          Aplicar
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total no período</p>
        <p className="text-3xl font-bold text-slate-900">
          {loading ? "…" : (data?.total ?? 0)}
        </p>
        {!loading && data && data.missingConclusaoCount > 0 ? (
          <p className="mt-1 text-xs text-amber-700">
            {data.missingConclusaoCount} card(s) com status Concluído sem data de conclusão (não
            entram neste relatório).
          </p>
        ) : null}
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {err}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Quadro</th>
                <th className="px-3 py-2">Severidade</th>
                <th className="px-3 py-2">Setor</th>
                <th className="px-3 py-2">Modelos / Linha</th>
                <th className="px-3 py-2">Responsável</th>
                <th className="px-3 py-2">Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                    Carregando entregas…
                  </td>
                </tr>
              ) : null}
              {!loading &&
                data?.cards.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                    onClick={() => {
                      setOpenCardId(c.id);
                      setOpenBoardId(c.board_id);
                    }}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-bold">
                      {formatCardCodigo(c.codigo) || "—"}
                    </td>
                    <td className="max-w-[16rem] px-3 py-2 font-medium text-slate-900">
                      <span className="line-clamp-2">{c.titulo}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{c.quadro_titulo}</td>
                    <td className="px-3 py-2">{c.severidade}</td>
                    <td className="px-3 py-2">{c.setor_responsavel}</td>
                    <td className="max-w-[14rem] px-3 py-2 text-xs text-slate-600">
                      <span className="line-clamp-2">
                        {(c.modelo_produto ?? []).join(", ") || "—"} ·{" "}
                        {(c.linha ?? []).join(", ") || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">{c.responsavel || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatDateBR(c.data_conclusao)}</td>
                  </tr>
                ))}
              {!loading && data && data.cards.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                    Nenhuma entrega concluída neste período.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <CardDetailModal
        open={!!openCardId}
        cardId={openCardId}
        boardId={openBoardId}
        onClose={() => {
          setOpenCardId(null);
          setOpenBoardId("");
        }}
      />
    </div>
  );
}
