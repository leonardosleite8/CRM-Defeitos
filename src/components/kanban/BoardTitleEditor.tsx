"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateBoardTitulo } from "@/app/actions/defeitos";

export function BoardTitleEditor({ boardId, initialTitulo }: { boardId: string; initialTitulo: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialTitulo);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialTitulo);
  }, [initialTitulo]);

  const save = async () => {
    setErr(null);
    setSaving(true);
    try {
      await updateBoardTitulo(boardId, value);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <label className="text-xs font-medium text-slate-600">Nome do quadro</label>
      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 md:text-lg"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          disabled={saving || value.trim() === initialTitulo.trim()}
          onClick={() => void save()}
          className="shrink-0 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
        >
          {saving ? "Salvandoâ€¦" : "Salvar"}
        </button>
      </div>
      {err ? <p className="mt-1 text-xs text-red-700">{err}</p> : null}
    </div>
  );
}

