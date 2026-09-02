import ExcelJS from "exceljs";
import type { EntregaCardRow } from "@/lib/queries/boards";
import { formatDateBR, formatDateTimeBR, formatMonthYearPT } from "@/lib/date";
import { formatCardCodigo } from "@/lib/cardCodigo";
import { flattenForExport } from "@/lib/exportFlatten";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E3A5F" },
};
const ZEBRA_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF1F5F9" },
};
const SECTION_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE2E8F0" },
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

const DETAIL_COLUMNS = [
  { key: "id", header: "ID", width: 10 },
  { key: "titulo", header: "Título", width: 35 },
  { key: "quadro", header: "Quadro", width: 22 },
  { key: "descricao", header: "Descrição", width: 40 },
  { key: "solucao", header: "Solução", width: 40 },
  { key: "origem", header: "Origem", width: 14 },
  { key: "setor_responsavel", header: "Setor responsável", width: 18 },
  { key: "status", header: "Status", width: 14 },
  { key: "etapa", header: "Etapa", width: 18 },
  { key: "severidade", header: "Severidade", width: 12 },
  { key: "modelo_produto", header: "Modelo(s)", width: 28 },
  { key: "linha", header: "Linha(s)", width: 18 },
  { key: "responsavel", header: "Responsável", width: 18 },
  { key: "data_criacao", header: "Data criação", width: 14 },
  { key: "data_conclusao", header: "Data conclusão", width: 14 },
  { key: "previsao_conclusao", header: "Previsão", width: 14 },
] as const;

export type EntregasExportInput = {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
  boardLabel: string;
  cards: EntregaCardRow[];
  total: number;
  leadTimeDays: number | null;
  chartModel: { name: string; value: number }[];
  chartSev: { name: string; value: number }[];
};

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.fill = HEADER_FILL;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cell.border = THIN_BORDER;
}

function styleDataCell(cell: ExcelJS.Cell, zebra: boolean) {
  if (zebra) cell.fill = ZEBRA_FILL;
  cell.alignment = { vertical: "top", horizontal: "left", wrapText: true };
  cell.border = THIN_BORDER;
  cell.font = { size: 10, color: { argb: "FF0F172A" } };
}

export async function buildEntregasWorkbookBuffer(input: EntregasExportInput): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CRM Defeitos";
  wb.created = new Date();

  const ws = wb.addWorksheet("Entregas");

  const colCount = DETAIL_COLUMNS.length;
  ws.columns = DETAIL_COLUMNS.map((c) => ({ key: c.key, width: c.width }));

  const fromLabel = formatMonthYearPT(input.fromYear, input.fromMonth);
  const toLabel = formatMonthYearPT(input.toYear, input.toMonth);
  const title = `Entregas concluídas - ${fromLabel} até ${toLabel}`;

  // Título
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 28;

  // Subtítulo
  ws.mergeCells(2, 1, 2, colCount);
  const sub = ws.getCell(2, 1);
  sub.value = `${input.boardLabel} · Gerado em ${formatDateTimeBR(new Date().toISOString())}`;
  sub.font = { size: 10, color: { argb: "FF64748B" } };
  ws.getRow(2).height = 18;

  let row = 4;

  // Seção indicadores
  ws.mergeCells(row, 1, row, 4);
  const indTitle = ws.getCell(row, 1);
  indTitle.value = "Indicadores do período";
  indTitle.font = { bold: true, size: 13, color: { argb: "FF1E3A5F" } };
  indTitle.fill = SECTION_FILL;
  ws.getRow(row).height = 22;
  row += 1;

  // KPIs
  ws.getCell(row, 1).value = "Total de cards";
  ws.getCell(row, 1).font = { bold: true, size: 10 };
  ws.getCell(row, 2).value = input.total;
  ws.getCell(row, 2).font = { bold: true, size: 14, color: { argb: "FF1E3A5F" } };
  row += 1;

  ws.getCell(row, 1).value = "Tempo médio de resolução (lead time)";
  ws.getCell(row, 1).font = { bold: true, size: 10 };
  ws.getCell(row, 2).value =
    input.leadTimeDays == null ? "—" : `${input.leadTimeDays.toFixed(1)} dias`;
  ws.getCell(row, 2).font = { bold: true, size: 14, color: { argb: "FF1E3A5F" } };
  ws.getCell(row, 3).value = "Média entre data de criação e data de conclusão";
  ws.getCell(row, 3).font = { size: 9, color: { argb: "FF64748B" }, italic: true };
  row += 2;

  // Por modelo
  ws.getCell(row, 1).value = "Defeitos por modelo de produto";
  ws.getCell(row, 1).font = { bold: true, size: 11 };
  ws.mergeCells(row, 1, row, 2);
  row += 1;

  styleHeaderCell(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Modelo";
  styleHeaderCell(ws.getCell(row, 2));
  ws.getCell(row, 2).value = "Quantidade";
  row += 1;

  if (input.chartModel.length === 0) {
    ws.getCell(row, 1).value = "—";
    ws.getCell(row, 2).value = 0;
    styleDataCell(ws.getCell(row, 1), false);
    styleDataCell(ws.getCell(row, 2), false);
    row += 1;
  } else {
    input.chartModel.forEach((item, i) => {
      ws.getCell(row, 1).value = item.name;
      ws.getCell(row, 2).value = item.value;
      styleDataCell(ws.getCell(row, 1), i % 2 === 1);
      styleDataCell(ws.getCell(row, 2), i % 2 === 1);
      row += 1;
    });
  }
  row += 1;

  // Por severidade
  ws.getCell(row, 1).value = "Distribuição por severidade";
  ws.getCell(row, 1).font = { bold: true, size: 11 };
  ws.mergeCells(row, 1, row, 3);
  row += 1;

  styleHeaderCell(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Severidade";
  styleHeaderCell(ws.getCell(row, 2));
  ws.getCell(row, 2).value = "Quantidade";
  styleHeaderCell(ws.getCell(row, 3));
  ws.getCell(row, 3).value = "%";
  row += 1;

  const sevTotal = input.chartSev.reduce((s, x) => s + x.value, 0) || 1;
  if (input.chartSev.length === 0) {
    ws.getCell(row, 1).value = "—";
    ws.getCell(row, 2).value = 0;
    ws.getCell(row, 3).value = "0%";
    styleDataCell(ws.getCell(row, 1), false);
    styleDataCell(ws.getCell(row, 2), false);
    styleDataCell(ws.getCell(row, 3), false);
    row += 1;
  } else {
    input.chartSev.forEach((item, i) => {
      const pct = ((item.value / sevTotal) * 100).toFixed(0);
      ws.getCell(row, 1).value = item.name;
      ws.getCell(row, 2).value = item.value;
      ws.getCell(row, 3).value = `${pct}%`;
      styleDataCell(ws.getCell(row, 1), i % 2 === 1);
      styleDataCell(ws.getCell(row, 2), i % 2 === 1);
      styleDataCell(ws.getCell(row, 3), i % 2 === 1);
      row += 1;
    });
  }
  row += 2;

  // Detalhamento
  ws.mergeCells(row, 1, row, colCount);
  const detTitle = ws.getCell(row, 1);
  detTitle.value = "Detalhamento das entregas";
  detTitle.font = { bold: true, size: 13, color: { argb: "FF1E3A5F" } };
  detTitle.fill = SECTION_FILL;
  ws.getRow(row).height = 22;
  row += 1;

  const headerRow = row;
  DETAIL_COLUMNS.forEach((col, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = col.header;
    styleHeaderCell(cell);
  });
  ws.getRow(headerRow).height = 22;
  row += 1;

  for (let i = 0; i < input.cards.length; i++) {
    const c = input.cards[i];
    const values = [
      formatCardCodigo(c.codigo) || c.id.slice(0, 8),
      flattenForExport(c.titulo),
      flattenForExport(c.quadro_titulo),
      flattenForExport(c.descricao),
      flattenForExport(c.solucao),
      flattenForExport(c.origem),
      flattenForExport(c.setor_responsavel),
      flattenForExport(c.status),
      flattenForExport(c.etapa),
      flattenForExport(c.severidade),
      flattenForExport(c.modelo_produto),
      flattenForExport(c.linha),
      flattenForExport(c.responsavel),
      formatDateBR(c.data_criacao),
      formatDateBR(c.data_conclusao),
      formatDateBR(c.previsao_conclusao),
    ];
    const zebra = i % 2 === 1;
    values.forEach((val, idx) => {
      const cell = ws.getCell(row, idx + 1);
      cell.value = val;
      styleDataCell(cell, zebra);
    });
    ws.getRow(row).height = 36;
    row += 1;
  }

  if (input.cards.length === 0) {
    ws.mergeCells(row, 1, row, colCount);
    ws.getCell(row, 1).value = "Nenhuma entrega concluída neste período.";
    ws.getCell(row, 1).font = { italic: true, color: { argb: "FF64748B" } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  if (buffer instanceof ArrayBuffer) return buffer;
  const bytes = new Uint8Array(buffer as unknown as ArrayBuffer);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export function downloadEntregasXlsx(buffer: ArrayBuffer, from: string, to: string) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `entregas_${from}_ate_${to}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
