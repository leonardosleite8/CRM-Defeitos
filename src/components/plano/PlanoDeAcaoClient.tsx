"use client";

import { useMemo, useState } from "react";
import type { DefectCardRow } from "@/lib/types/db";
import {
  DEFECT_ORIGEM,
  DEFECT_SEVERIDADE,
  DEFECT_STATUS,
  LINHAS,
  MODELOS_PRODUTO,
} from "@/lib/constants";
import { formatDateBR } from "@/lib/date";
import { Download, Search } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";

function matchesQuery(card: DefectCardRow, q: string): boolean {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [
    card.titulo,
    card.descricao,
    card.solucao,
    card.responsavel,
    card.setor_responsavel,
    card.origem,
    card.status,
    card.severidade,
    ...(card.modelo_produto ?? []),
    ...(card.linha ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function PlanoDeAcaoClient({ initialCards }: { initialCards: DefectCardRow[] }) {
  const readOnly = useAuth()?.role === "observer";
  const [setor, setSetor] = useState("");
  const [modelo, setModelo] = useState("");
  const [linha, setLinha] = useState("");
  const [status, setStatus] = useState("");
  const [severidade, setSeveridade] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return initialCards.filter((c) => {
      if (setor && c.setor_responsavel !== setor) return false;
      if (modelo && !(c.modelo_produto ?? []).includes(modelo)) return false;
      if (linha && !(c.linha ?? []).includes(linha)) return false;
      if (status && c.status !== status) return false;
      if (severidade && c.severidade !== severidade) return false;
      if (!matchesQuery(c, q)) return false;
      return true;
    });
  }, [initialCards, setor, modelo, linha, status, severidade, q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((c) => c.id)));
  };

  const exportSelected = async () => {
    const ids = filtered.filter((c) => selected.has(c.id)).map((c) => c.id);
    const cardIds = ids.length ? ids : filtered.map((c) => c.id);
    if (!cardIds.length) {
      setErr("Nenhum card para exportar.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/plano-de-acao/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Falha ao exportar");
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") || "";
      const match = dispo.match(/filename="([^"]+)"/);
      const filename = match?.[1] || (cardIds.length > 1 ? "planos.zip" : "plano.docx");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plano de ação</h1>
          <p className="text-sm text-slate-600">
            {readOnly
              ? "Consulta das demandas. O perfil Observador não exporta arquivos."
              : "Filtre as demandas e exporte um Word (.doc) por card (vários viram ZIP)."}
          </p>
        </div>
        {!readOnly ? (
        <button
          type="button"
          disabled={busy || filtered.length === 0}
          onClick={() => void exportSelected()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {busy
            ? "Gerando…"
            : selected.size
              ? `Exportar selecionados (${selected.size})`
              : `Exportar filtrados (${filtered.length})`}
        </button>
        ) : null}
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{err}</div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-[140px] flex-1 flex-col text-xs font-medium text-slate-600">
            Setor responsável
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
            >
              <option value="">Todos</option>
              {DEFECT_ORIGEM.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col text-xs font-medium text-slate-600">
            Modelo
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
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
              value={linha}
              onChange={(e) => setLinha(e.target.value)}
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
            Status
            <select
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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
              value={severidade}
              onChange={(e) => setSeveridade(e.target.value)}
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
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por palavras…"
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-2 text-sm"
            />
          </span>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {!readOnly ? (
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </th>
              ) : null}
              <th className="px-3 py-2">Título</th>
              <th className="px-3 py-2">Responsável</th>
              <th className="px-3 py-2">Setor</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Previsão</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                {!readOnly ? (
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    aria-label={`Selecionar ${c.titulo}`}
                  />
                </td>
                ) : null}
                <td className="px-3 py-2 font-medium text-slate-900">{c.titulo}</td>
                <td className="px-3 py-2 text-slate-700">{c.responsavel || "—"}</td>
                <td className="px-3 py-2 text-slate-700">{c.setor_responsavel}</td>
                <td className="px-3 py-2 text-slate-700">{c.status}</td>
                <td className="px-3 py-2 text-slate-700">{formatDateBR(c.previsao_conclusao)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 5 : 6} className="px-3 py-8 text-center text-slate-500">
                  Nenhum card encontrado com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
