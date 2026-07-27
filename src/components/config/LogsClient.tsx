"use client";

import { formatDateTimeBR } from "@/lib/date";

type LogRow = {
  id: string;
  user_email: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

export function LogsClient({ logs }: { logs: LogRow[] }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Logs</h1>
        <p className="text-sm text-slate-600">Auditoria de ações do sistema (somente admin).</p>
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
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTimeBR(l.created_at)}</td>
                  <td className="px-3 py-2">{l.user_email || "—"}</td>
                  <td className="px-3 py-2">{l.action}</td>
                  <td className="px-3 py-2 text-slate-600">{l.detail || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Nenhum log ainda.
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
