import { LINHAS, MODELOS_PRODUTO } from "@/lib/constants";

type WithProducts = { modelo_produto?: string[] | null; linha?: string[] | null };

/** Lista fixa + valores já gravados nos cards (sem duplicar, extras em ordem alfabética). */
export function mergeOptions(base: readonly string[], values: Iterable<string>): string[] {
  const seen = new Set(base.map((v) => v.toLowerCase()));
  const extras: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    extras.push(v);
  }
  extras.sort((a, b) => a.localeCompare(b, "pt-BR"));
  return [...base, ...extras];
}

export function productOptionsFromCards(cards: WithProducts[]) {
  return {
    modelos: mergeOptions(
      MODELOS_PRODUTO,
      cards.flatMap((c) => c.modelo_produto ?? []),
    ),
    linhas: mergeOptions(
      LINHAS,
      cards.flatMap((c) => c.linha ?? []),
    ),
  };
}
