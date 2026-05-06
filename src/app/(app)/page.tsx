import Link from "next/link";
import { listBoards } from "@/lib/queries/boards";
import { createBoardWithDefaults } from "@/app/actions/defeitos";
import { ConfigAlert } from "@/components/ConfigAlert";
import { formatDateBR, formatDateTimeBR } from "@/lib/date";
import { Plus, LayoutGrid } from "lucide-react";

function hasEnv() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function HomePage() {
  if (!hasEnv()) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Defeitos de Produtos</h1>
        <ConfigAlert />
      </div>
    );
  }

  let boards: Awaited<ReturnType<typeof listBoards>> = [];
  let error: string | null = null;
  try {
    boards = await listBoards();
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro ao listar quadros";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quadros</h1>
          <p className="text-sm text-slate-600">Gerencie defeitos por quadro Kanban.</p>
        </div>
        <form
          action={async () => {
            "use server";
            const id = await createBoardWithDefaults(`Quadro ${formatDateBR(new Date().toISOString())}`);
            const { redirect } = await import("next/navigation");
            redirect(`/quadros/${id}`);
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950"
          >
            <Plus className="h-4 w-4" />
            Novo quadro
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
          <div className="mt-2">
            <ConfigAlert />
          </div>
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <LayoutGrid className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-slate-700">Nenhum quadro ainda. Crie o primeiro.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/quadros/${b.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-900/40 hover:shadow-md"
              >
                <h2 className="font-semibold text-slate-900">{b.titulo}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Atualizado em {formatDateTimeBR(b.updated_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

