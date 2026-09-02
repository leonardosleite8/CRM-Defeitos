/** Data no formato brasileiro DD/MM/AAAA (sem hora). */
export function formatDateBR(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

/** Data e hora no formato brasileiro DD/MM/AAAA HH:mm (fuso de São Paulo). */
export function formatDateTimeBR(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function parseDateBRToISO(value: string): string | null {
  const v = value.trim();
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function isoToDateBRInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = iso.slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

export function maskDateBRInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

const MONTH_NAMES_PT = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

/** Nome do mês em PT maiúsculo (mês 1–12). */
export function monthNamePT(month: number): string {
  return MONTH_NAMES_PT[month - 1] ?? String(month);
}

/** Ex.: JULHO/2026 */
export function formatMonthYearPT(year: number, month: number): string {
  return `${monthNamePT(month)}/${year}`;
}

/**
 * Intervalo [start, endExclusive) em ISO UTC para meses civis em America/Sao_Paulo (UTC−3 fixo).
 * month: 1–12
 */
export function periodBoundsSaoPaulo(input: {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}): { startIso: string; endExclusiveIso: string } {
  const { fromYear, fromMonth, toYear, toMonth } = input;
  // 00:00 SP = 03:00 UTC
  const startIso = new Date(Date.UTC(fromYear, fromMonth - 1, 1, 3, 0, 0, 0)).toISOString();
  // 1º dia do mês seguinte a `to`, 00:00 SP
  const endExclusiveIso = new Date(Date.UTC(toYear, toMonth, 1, 3, 0, 0, 0)).toISOString();
  return { startIso, endExclusiveIso };
}

