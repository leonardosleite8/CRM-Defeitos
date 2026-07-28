"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { KanbanColumnRow } from "@/lib/types/db";
import { MODELOS_PRODUTO, LINHAS, DEFECT_ORIGEM, DEFECT_SEVERIDADE, type DefectOrigem, type DefectSeveridade } from "@/lib/constants";
import { parseDateBRToISO } from "@/lib/date";
import { createDefectCard, updateDefectCardMedia } from "@/app/actions/defeitos";
import { uploadFileWithProgress, buildStoragePath } from "@/lib/upload";
import { CreatableMultiSelect } from "./CreatableMultiSelect";
import { DateBRPickerInput } from "./DateBRPickerInput";
import { X } from "lucide-react";

type ProgressFile = { name: string; percent: number; done: boolean; error?: string };

export function NewDefectModal({
  open,
  boardId,
  columnId,
  columns,
  onClose,
}: {
  open: boolean;
  boardId: string;
  columnId: string | null;
  columns: KanbanColumnRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [col, setCol] = useState<string>(columnId ?? columns[0]?.id ?? "");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [solucao, setSolucao] = useState("");
  const [origem, setOrigem] = useState<DefectOrigem>("Outros");
  const [setorResponsavel, setSetorResponsavel] = useState<DefectOrigem>("Outros");
  const [severidade, setSeveridade] = useState<DefectSeveridade>("Baixa");
  const [modelos, setModelos] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<string[]>([]);
  const [modeloOptions, setModeloOptions] = useState<string[]>([...MODELOS_PRODUTO]);
  const [linhaOptions, setLinhaOptions] = useState<string[]>([...LINHAS]);
  const [responsavel, setResponsavel] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<ProgressFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open && columnId) setCol(columnId);
    else if (open && columns[0]?.id) setCol(columns[0].id);
  }, [open, columnId, columns]);

  if (!open) return null;

  const reset = () => {
    setTitulo("");
    setDescricao("");
    setSolucao("");
    setOrigem("Outros");
    setSetorResponsavel("Outros");
    setSeveridade("Baixa");
    setModelos([]);
    setLinhas([]);
    setModeloOptions([...MODELOS_PRODUTO]);
    setLinhaOptions([...LINHAS]);
    setResponsavel("");
    setPrevisao("");
    setFiles([]);
    setProgress([]);
    setErr(null);
    setCol(columnId ?? columns[0]?.id ?? "");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!col) {
      setErr("Selecione uma coluna.");
      return;
    }
    const previsaoIso = previsao ? parseDateBRToISO(previsao) : null;
    if (previsao && !previsaoIso) {
      setErr("Previsão de conclusão inválida. Use dd/mm/aaaa.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const cardId = await createDefectCard({
        boardId,
        columnId: col,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        solucao: solucao.trim(),
        origem,
        setorResponsavel,
        severidade,
        modeloProduto: modelos,
        linha: linhas,
        responsavel: responsavel.trim(),
        mediaUrls: [],
        previsaoConclusao: previsaoIso,
      });

      const urls: string[] = [];
      if (files.length) {
        setProgress(
          files.map((f) => ({
            name: f.name,
            percent: 0,
            done: false,
          })),
        );
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          try {
            const path = buildStoragePath(boardId, cardId, f);
            const { publicUrl } = await uploadFileWithProgress(f, path, (pct) => {
              setProgress((prev) => prev.map((p, j) => (j === i ? { ...p, percent: pct } : p)));
            });
            urls.push(publicUrl);
            setProgress((prev) => prev.map((p, j) => (j === i ? { ...p, percent: 100, done: true } : p)));
          } catch (ex) {
            const msg = ex instanceof Error ? ex.message : "Falha no upload";
            setProgress((prev) => prev.map((p, j) => (j === i ? { ...p, done: true, error: msg } : p)));
            throw ex;
          }
        }
        if (urls.length) await updateDefectCardMedia(cardId, boardId, urls);
      }

      handleClose();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      // Evita mostrar o digest genérico do Next em produção
      if (/Server Components render|digest/i.test(msg)) {
        setErr(
          "Falha ao criar o card. Se o problema continuar, execute no Supabase a migration 010_add_card_ordem.sql e tente de novo.",
        );
      } else {
        setErr(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">Novo defeito</h2>
          <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={handleClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 p-4">
          {err ? <p className="text-sm text-red-700">{err}</p> : null}
          <label className="block text-sm font-medium text-slate-700">
            Título *
            <input
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Descrição / Comentários
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Solução
            <textarea
              className="mt-1 min-h-[96px] w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
            />
          </label>
          <CreatableMultiSelect
            label="Modelos de produto *"
            options={modeloOptions}
            selected={modelos}
            onSelectedChange={setModelos}
            onOptionsChange={setModeloOptions}
            placeholder="Nenhum modelo selecionado"
          />
          <CreatableMultiSelect
            label="Linhas *"
            options={linhaOptions}
            selected={linhas}
            onSelectedChange={setLinhas}
            onOptionsChange={setLinhaOptions}
            placeholder="Nenhuma linha selecionada"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Severidade
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                value={severidade}
                onChange={(e) => setSeveridade(e.target.value as DefectSeveridade)}
              >
                {DEFECT_SEVERIDADE.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <DateBRPickerInput label="Previsão de conclusão (dd/mm/aaaa)" value={previsao} onChange={setPrevisao} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Origem
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                value={origem}
                onChange={(e) => setOrigem(e.target.value as DefectOrigem)}
              >
                {DEFECT_ORIGEM.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Setor responsável
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                value={setorResponsavel}
                onChange={(e) => setSetorResponsavel(e.target.value as DefectOrigem)}
              >
                {DEFECT_ORIGEM.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Coluna inicial
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                value={col}
                onChange={(e) => setCol(e.target.value)}
                required
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Responsável
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Anexos (fotos, vídeos, PDF, DOC, Excel)
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
              className="mt-1 w-full text-sm"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {progress.length ? (
            <ul className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
              {progress.map((p) => (
                <li key={p.name}>
                  <div className="flex justify-between gap-2">
                    <span className="truncate font-medium text-slate-800">{p.name}</span>
                    <span className="text-slate-600">{p.error ? "Erro" : `${p.percent}%`}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200">
                    <div
                      className={`h-full ${p.error ? "bg-red-500" : "bg-blue-800"}`}
                      style={{ width: `${p.percent}%` }}
                    />
                  </div>
                  {p.error ? <p className="mt-0.5 text-red-700">{p.error}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={handleClose}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
            >
              {submitting ? "Salvando…" : "Criar card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
