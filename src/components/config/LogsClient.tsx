"use client";

import { useMemo, useState } from "react";
import { formatDateTimeBR } from "@/lib/date";
import { AUDIT_ACTION_LABELS, auditActionLabel } from "@/lib/auditLabels";

type LogRow = {
  id: string;
  user_email: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

export function LogsClient({ logs }: { logs: LogRow[] }) {
  const [actionFilter, setActionFilter] = useState("");
  const [query, setQuery] = useState("");

  const actionOptions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set).sort((a, b) => auditActionLabel(a).localeCompare(auditActionLabel(b), "pt-BR"));
  }, [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter && l.action !== actionFilter) return false;
      if (!q) return true;
      const hay = `${l.user_email ?? ""} ${auditActionLabel(l.action)} ${l.action} ${l.detail ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [logs, actionFilter, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Logs</h1>
        <p className="text-sm text-slate-600">Auditoria de ações do sistema (somente admin).</p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <label className="text-xs font-medium text-slate-600">
          Ação
          <select
            className="mt-1 block min-w-[12rem] rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[16rem] flex-1 text-xs font-medium text-slate-600">
          Buscar
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Usuário, detalhe, código…"
          />
        </label>
        <p className="self-end text-xs text-slate-500">
          {filtered.length} de {logs.length} registro(s)
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Ação</th>
                <th className="px-3 py-2">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTimeBR(l.created_at)}</td>
                  <td className="px-3 py-2">{l.user_email || "—"}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{auditActionLabel(l.action)}</td>
                  <td className="px-3 py-2 text-slate-600">{l.detail || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Nenhum log encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
