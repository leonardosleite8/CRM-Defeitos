import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeCard } from "@/lib/queries/boards";
import type { DefectCardRow } from "@/lib/types/db";
import type { DefectOrigem, DefectSeveridade, DefectStatus } from "@/lib/constants";

export type PlanoFilters = {
  setor?: DefectOrigem;
  modelo?: string;
  linha?: string;
  status?: DefectStatus;
  severidade?: DefectSeveridade;
  q?: string;
};

export async function listCardsForPlano(filters: PlanoFilters = {}): Promise<DefectCardRow[]> {
  const supabase = createServerSupabase();
  let q = supabase.from("defect_cards").select("*").order("data_criacao", { ascending: false });
  if (filters.setor) q = q.eq("setor_responsavel", filters.setor);
  if (filters.modelo) q = q.contains("modelo_produto", [filters.modelo]);
  if (filters.linha) q = q.contains("linha", [filters.linha]);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.severidade) q = q.eq("severidade", filters.severidade);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let list = (data ?? []).map((c) => normalizeCard(c as Record<string, unknown>));

  const query = filters.q?.trim().toLowerCase();
  if (query) {
    const words = query.split(/\s+/).filter(Boolean);
    list = list.filter((c) => {
      const hay = [
        c.titulo,
        c.descricao,
        c.solucao,
        c.responsavel,
        c.setor_responsavel,
        c.origem,
        c.status,
        c.severidade,
        ...(c.modelo_produto ?? []),
        ...(c.linha ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }

  return list;
}
