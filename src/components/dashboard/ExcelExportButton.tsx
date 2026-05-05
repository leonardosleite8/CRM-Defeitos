"use client";

import type { DefectCardRow } from "@/lib/types/db";
import { buildExportRows } from "@/lib/buildExportRows";
import { escapeCsvCell } from "@/lib/exportFlatten";
import { Download, FileSpreadsheet } from "lucide-react";

export function ExcelExportButton({ cards }: { cards: DefectCardRow[] }) {
  const rows = buildExportRows(cards);

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Defeitos");
    XLSX.writeFile(wb, `defeitos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]) as (keyof (typeof rows)[0])[];
    const lines = [
      headers.map((h) => escapeCsvCell(String(h))).join(","),
      ...rows.map((row) => headers.map((h) => escapeCsvCell(String(row[h] ?? ""))).join(",")),
    ];
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `defeitos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={exportXlsx}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Exportar Excel
      </button>
      <button
        type="button"
        onClick={exportCsv}
        disabled={!cards.length}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Exportar CSV
      </button>
    </div>
  );
}
