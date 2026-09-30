import { getDashboardData } from "@/lib/queries/boards";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { ExcelExportButton } from "@/components/dashboard/ExcelExportButton";
import { ConfigAlert } from "@/components/ConfigAlert";
import { MODELOS_PRODUTO, DEFECT_ORIGEM, DEFECT_SEVERIDADE, LINHAS } from "@/lib/constants";
import type { DefectOrigem, DefectSeveridade } from "@/lib/constants";
import { getSession } from "@/lib/auth/getSession";

function hasEnv() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ modelo?: string; severidade?: string; linha?: string; origem?: string }>;
}) {
  const sp = await searchParams;
  const modelo = sp.modelo || undefined;
  const severidade = (sp.severidade as DefectSeveridade | undefined) || undefined;
  const linha = sp.linha || undefined;
  const origem = (sp.origem as DefectOrigem | undefined) || undefined;

  if (!hasEnv()) {
    return (
      <div className="mx-auto max-w-2xl">
        <ConfigAlert />
      </div>
    );
  }

  const session = await getSession();
  const readOnly = session?.role === "observer";
  const data = await getDashboardData({ modelo, severidade, linha, origem });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            {readOnly ? "Indicadores do período." : "Indicadores e exportação de relatórios."}
          </p>
        </div>
        {!readOnly ? <ExcelExportButton cards={data.cards} etapaByColumnId={data.etapaByColumnId} /> : null}
      </div>

      <form className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-medium text-slate-600">
          Modelo
          <select
            name="modelo"
            defaultValue={modelo ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Todos</option>
            {MODELOS_PRODUTO.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Linha
          <select
            name="linha"
            defaultValue={linha ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Todas</option>
            {LINHAS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Origem
          <select
            name="origem"
            defaultValue={origem ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Todas</option>
            {DEFECT_ORIGEM.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Severidade
          <select
            name="severidade"
            defaultValue={severidade ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            <option value="">Todas</option>
            {DEFECT_SEVERIDADE.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950">
          Aplicar filtros
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total de cards</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{data.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tempo médio de resolução (lead time)</p>
          <p className="mt-2 text-3xl font-bold text-blue-950">
            {data.leadTimeDays != null ? `${data.leadTimeDays.toFixed(1)} dias` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Média entre data de criação e data de conclusão (cards concluídos).</p>
        </div>
      </div>

      <DashboardCharts byModel={data.chartModel} bySev={data.chartSev} />
    </div>
  );
}

