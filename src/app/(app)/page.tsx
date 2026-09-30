import Link from "next/link";
import { listBoards } from "@/lib/queries/boards";
import { createBoardWithDefaults } from "@/app/actions/defeitos";
import { ConfigAlert } from "@/components/ConfigAlert";
import { formatDateBR, formatDateTimeBR } from "@/lib/date";
import { Plus, LayoutGrid } from "lucide-react";
import { getSession } from "@/lib/auth/getSession";

function hasEnv() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function HomePage() {
  if (!hasEnv()) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Qualidade Urano</h1>
        <ConfigAlert />
      </div>
    );
  }

  const session = await getSession();
  const readOnly = session?.role === "observer";

  let boards: Awaited<ReturnType<typeof listBoards>> = [];
  let error: string | null = null;
  try {
    boards = await listBoards();
  } catch (e) {
    error = e instanceof Error ? e.message : "Erro ao listar quadros";
  }

  return (
    <div className="w-full max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Quadros</h1>
          <p className="mt-1 text-base text-slate-600">Gerencie defeitos por quadro Kanban.</p>
        </div>
        {!readOnly ? (
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
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {error}
          <div className="mt-2">
            <ConfigAlert />
          </div>
        </div>
      ) : boards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <LayoutGrid className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-lg text-slate-700">Nenhum quadro ainda. Crie o primeiro.</p>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/quadros/${b.id}`}
                className="group flex min-h-44 flex-col justify-between rounded-2xl border border-slate-200 border-l-4 border-l-blue-900 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-900 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-900 transition group-hover:bg-blue-900 group-hover:text-white">
                    <LayoutGrid className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold leading-snug text-slate-900 group-hover:text-blue-950">
                      {b.titulo}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Atualizado em {formatDateTimeBR(b.updated_at)}
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-sm font-medium text-blue-900 opacity-0 transition group-hover:opacity-100">
                  Abrir quadro
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

