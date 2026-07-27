import { notFound } from "next/navigation";
import { getBoardPayload } from "@/lib/queries/boards";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ConfigAlert } from "@/components/ConfigAlert";

function hasEnv() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function QuadroPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  if (!hasEnv()) {
    return (
      <div className="mx-auto max-w-2xl">
        <ConfigAlert />
      </div>
    );
  }

  try {
    const payload = await getBoardPayload(boardId);
    return <KanbanBoard boardId={boardId} initial={payload} />;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const missing = /not found|não encontrado|0 rows|PGRST116/i.test(message);
    if (missing) notFound();

    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Não foi possível carregar o quadro.</p>
        <p className="mt-2">{message}</p>
        <p className="mt-3 text-amber-900">
          Se a mensagem citar a coluna <code className="rounded bg-amber-100 px-1">ordem</code>,
          execute a migration{" "}
          <code className="rounded bg-amber-100 px-1">010_add_card_ordem.sql</code> no SQL Editor
          do Supabase e recarregue a página.
        </p>
      </div>
    );
  }
}
