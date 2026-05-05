import type { DefectCardRow } from "@/lib/types/db";
import { formatDateBR } from "@/lib/date";
import { flattenForExport } from "@/lib/exportFlatten";

/** Linhas normalizadas para Excel e CSV (valores já são strings “humanas”). */
export function buildExportRows(cards: DefectCardRow[]) {
  return cards.map((c) => ({
    id: c.id,
    titulo: flattenForExport(c.titulo),
    descricao: flattenForExport(c.descricao),
    solucao: flattenForExport(c.solucao),
    origem: flattenForExport(c.origem),
    setor_responsavel: flattenForExport(c.setor_responsavel),
    status: flattenForExport(c.status),
    severidade: flattenForExport(c.severidade),
    modelo_produto: flattenForExport(c.modelo_produto),
    linha: flattenForExport(c.linha),
    responsavel: flattenForExport(c.responsavel),
    media_urls: flattenForExport(c.media_urls),
    data_criacao: formatDateBR(c.data_criacao),
    data_conclusao: formatDateBR(c.data_conclusao),
    previsao_conclusao: formatDateBR(c.previsao_conclusao),
  }));
}
