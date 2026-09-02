import { listBoards } from "@/lib/queries/boards";
import { EntregasClient } from "@/components/entregas/EntregasClient";
import { ConfigAlert } from "@/components/ConfigAlert";

function hasEnv() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function parseYearMonth(value: string | undefined, fallback: { year: number; month: number }) {
  if (!value) return fallback;
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m) return fallback;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return fallback;
  return { year, month };
}

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; quadro?: string }>;
}) {
  if (!hasEnv()) {
    return (
      <div className="mx-auto max-w-2xl">
        <ConfigAlert />
      </div>
    );
  }

  const sp = await searchParams;
  const now = new Date();
  const defaultYm = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const from = parseYearMonth(sp.de, defaultYm);
  const to = parseYearMonth(sp.ate, from);
  const boardId = sp.quadro?.trim() || "";

  const boards = await listBoards();

  return (
    <EntregasClient
      boards={boards.map((b) => ({ id: b.id, titulo: b.titulo }))}
      fromYear={from.year}
      fromMonth={from.month}
      toYear={to.year}
      toMonth={to.month}
      boardId={boardId}
    />
  );
}
