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
  } catch {
    notFound();
  }
}
