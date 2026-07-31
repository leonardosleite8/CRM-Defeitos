"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchCardDetail, addComment, deleteDefectCard, updateDefectCardFields, updateComment } from "@/app/actions/defeitos";
import type { DefectCardRow, DefectCommentRow } from "@/lib/types/db";
import {
  DEFECT_STATUS,
  DEFECT_ORIGEM,
  DEFECT_SEVERIDADE,
  MODELOS_PRODUTO,
  LINHAS,
  type DefectOrigem,
  type DefectSeveridade,
  type DefectStatus,
} from "@/lib/constants";
import { formatDateBR, formatDateTimeBR, isoToDateBRInput, parseDateBRToISO } from "@/lib/date";
import { CreatableMultiSelect } from "./CreatableMultiSelect";
import { DateBRPickerInput } from "./DateBRPickerInput";
import { CommentRichEditor, type CommentEditorHandle } from "./CommentRichEditor";
import { CommentDisplay } from "./CommentDisplay";
import { buildStoragePath, uploadFileWithProgress } from "@/lib/upload";
import { FileText, Pencil, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { formatCardCodigo } from "@/lib/cardCodigo";

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url);
}

function fileNameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const file = path.split("/").pop() ?? "arquivo";
    return decodeURIComponent(file);
  } catch {
    return "arquivo";
  }
}

export function CardDetailModal({
  open,
  cardId,
  boardId,
  onClose,
}: {
  open: boolean;
  cardId: string | null;
  boardId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const user = useAuth();
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<DefectCardRow | null>(null);
  const [comments, setComments] = useState<DefectCommentRow[]>([]);
  const commentEditorRef = useRef<CommentEditorHandle>(null);
  const editCommentEditorRef = useRef<CommentEditorHandle>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [editTitulo, setEditTitulo] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSolucao, setEditSolucao] = useState("");
  const [editOrigem, setEditOrigem] = useState<DefectOrigem>("Outros");
  const [editSetorResponsavel, setEditSetorResponsavel] = useState<DefectOrigem>("Outros");
  const [editResp, setEditResp] = useState("");
  const [editStatus, setEditStatus] = useState<DefectStatus>("Aguardando");
  const [editSev, setEditSev] = useState<DefectSeveridade>("Baixa");
  const [editModelos, setEditModelos] = useState<string[]>([]);
  const [editLinhas, setEditLinhas] = useState<string[]>([]);
  const [modeloOptions, setModeloOptions] = useState<string[]>([...MODELOS_PRODUTO]);
  const [linhaOptions, setLinhaOptions] = useState<string[]>([...LINHAS]);
  const [editPrevisao, setEditPrevisao] = useState("");
  const [saving, setSaving] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open || !cardId) {
      setCard(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchCardDetail(cardId)
      .then((d) => {
        if (cancelled) return;
        const c = d.card as DefectCardRow;
        setCard(c);
        setComments(d.comments as DefectCommentRow[]);
        setEditTitulo(c.titulo);
        setEditDesc(c.descricao ?? "");
        setEditSolucao(c.solucao ?? "");
        setEditOrigem(c.origem ?? "Outros");
        setEditSetorResponsavel(c.setor_responsavel ?? "Outros");
        setEditResp(c.responsavel ?? "");
        setEditStatus(c.status);
        setEditSev(c.severidade);
        setEditModelos([...(c.modelo_produto ?? [])]);
        setEditLinhas([...(c.linha ?? [])]);
        setModeloOptions(Array.from(new Set([...MODELOS_PRODUTO, ...(c.modelo_produto ?? [])])));
        setLinhaOptions(Array.from(new Set([...LINHAS, ...(c.linha ?? [])])));
        setEditPrevisao(isoToDateBRInput(c.previsao_conclusao));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, cardId]);

  const reload = async () => {
    if (!cardId) return;
    const d = await fetchCardDetail(cardId);
    setCard(d.card as DefectCardRow);
    setComments(d.comments as DefectCommentRow[]);
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId) return;
    const plain = commentEditorRef.current?.getText()?.trim() ?? "";
    const html = commentEditorRef.current?.getHTML() ?? "";
    if (!plain) return;
    setErr(null);
    try {
      await addComment(cardId, boardId, html.trim());
      commentEditorRef.current?.clear();
      await reload();
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erro");
    }
  };

  const saveCommentEdit = async (commentId: string) => {
    if (!cardId) return;
    const plain = editCommentEditorRef.current?.getText()?.trim() ?? "";
    const html = editCommentEditorRef.current?.getHTML() ?? "";
    if (!plain) return;
    setErr(null);
    try {
      await updateComment(commentId, cardId, boardId, html.trim());
      setEditingCommentId(null);
      await reload();
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erro ao editar comentário");
    }
  };

  const canEditComment = (c: DefectCommentRow) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return (c.autor || "").trim() === user.name.trim();
  };

  const isCommentEdited = (c: DefectCommentRow) => {
    if (!c.updated_at) return false;
    return new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000;
  };

  const saveEdits = async () => {
    if (!cardId) return;
    if (!editModelos.length || !editLinhas.length) {
      setErr("Selecione ao menos um modelo e uma linha.");
      return;
    }
    const previsaoIso = editPrevisao ? parseDateBRToISO(editPrevisao) : null;
    if (editPrevisao && !previsaoIso) {
      setErr("Previsão de conclusão inválida. Use dd/mm/aaaa.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await updateDefectCardFields(cardId, boardId, {
        titulo: editTitulo.trim(),
        descricao: editDesc.trim(),
        solucao: editSolucao.trim(),
        origem: editOrigem,
        setor_responsavel: editSetorResponsavel,
        responsavel: editResp.trim(),
        status: editStatus,
        severidade: editSev,
        modelo_produto: editModelos,
        linha: editLinhas,
        previsao_conclusao: previsaoIso,
      });
      await reload();
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const uploadAttachments = async () => {
    if (!cardId || !card || filesToUpload.length === 0) return;
    setUploading(true);
    setErr(null);
    try {
      const urls: string[] = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const key = `${i}-${file.name}`;
        const path = buildStoragePath(boardId, cardId, file);
        const { publicUrl } = await uploadFileWithProgress(file, path, (pct) => {
          setUploadProgress((prev) => ({ ...prev, [key]: pct }));
        });
        urls.push(publicUrl);
      }
      const merged = Array.from(new Set([...(card.media_urls ?? []), ...urls]));
      await updateDefectCardFields(cardId, boardId, { media_urls: merged });
      setFilesToUpload([]);
      setUploadProgress({});
      await reload();
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erro ao enviar anexos");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!cardId) return;
    if (!confirm("Excluir este card permanentemente?")) return;
    try {
      await deleteDefectCard(cardId, boardId);
      onClose();
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erro");
    }
  };

  const removeAttachment = async (urlToRemove: string) => {
    if (!cardId || !card) return;
    const ok = confirm("Tem certeza que deseja apagar este anexo?");
    if (!ok) return;
    setErr(null);
    try {
      const next = (card.media_urls ?? []).filter((u) => u !== urlToRemove);
      await updateDefectCardFields(cardId, boardId, { media_urls: next });
      await reload();
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Erro ao apagar anexo");
    }
  };

  if (!open || !cardId) return null;

  const critical = card?.severidade === "Crítica";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 md:p-4" role="dialog">
      <div
        className={`flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-white shadow-2xl md:flex-row ${
          critical ? "border-red-600 ring-2 ring-red-500" : "border-slate-200"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-b border-slate-200 md:border-b-0 md:border-r">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">Detalhe do defeito</h2>
            </div>
            <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={onClose}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 p-4">
            {loading ? <p className="text-sm text-slate-600">Carregando…</p> : null}
            {err ? <p className="text-sm text-red-700">{err}</p> : null}
            {card ? (
              <>
                <div>
                  <p className="text-xs font-medium text-slate-600">ID</p>
                  <p className="mt-1 inline-flex rounded-md border border-slate-300 bg-slate-100 px-2.5 py-1.5 font-mono text-sm font-bold tracking-wide text-slate-900">
                    {formatCardCodigo(card.codigo) || "—"}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Título
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Responsável
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                      value={editResp}
                      onChange={(e) => setEditResp(e.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Origem
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                      value={editOrigem}
                      onChange={(e) => setEditOrigem(e.target.value as DefectOrigem)}
                    >
                      {DEFECT_ORIGEM.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Setor responsável
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                      value={editSetorResponsavel}
                      onChange={(e) => setEditSetorResponsavel(e.target.value as DefectOrigem)}
                    >
                      {DEFECT_ORIGEM.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Status
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as DefectStatus)}
                    >
                      {DEFECT_STATUS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Severidade
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                      value={editSev}
                      onChange={(e) => setEditSev(e.target.value as DefectSeveridade)}
                    >
                      {DEFECT_SEVERIDADE.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <DateBRPickerInput label="Previsão de conclusão (dd/mm/aaaa)" value={editPrevisao} onChange={setEditPrevisao} />
                </div>
                <CreatableMultiSelect
                  label="Modelos de produto"
                  options={modeloOptions}
                  selected={editModelos}
                  onSelectedChange={setEditModelos}
                  onOptionsChange={setModeloOptions}
                  placeholder="Nenhum modelo selecionado"
                />
                <CreatableMultiSelect
                  label="Linhas"
                  options={linhaOptions}
                  selected={editLinhas}
                  onSelectedChange={setEditLinhas}
                  onOptionsChange={setLinhaOptions}
                  placeholder="Nenhuma linha selecionada"
                />
                <label className="block text-sm font-medium text-slate-700">
                  Descrição / Comentários
                  <textarea
                    className="mt-1 min-h-[100px] w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Solução
                  <textarea
                    className="mt-1 min-h-[100px] w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
                    value={editSolucao}
                    onChange={(e) => setEditSolucao(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveEdits}
                    className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
                  >
                    {saving ? "Salvando…" : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50"
                  >
                    Excluir card
                  </button>
                </div>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>Data de criação: {formatDateBR(card.data_criacao)}</li>
                  <li>Data de conclusão: {formatDateBR(card.data_conclusao)}</li>
                  <li>Previsão de conclusão: {formatDateBR(card.previsao_conclusao)}</li>
                </ul>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Anexos</h3>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Adicionar anexos (fotos, vídeos, PDF, DOC, Excel)
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                        className="mt-1 w-full text-sm"
                        onChange={(e) => setFilesToUpload(Array.from(e.target.files ?? []))}
                      />
                    </label>
                    {filesToUpload.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        {filesToUpload.map((f, i) => {
                          const key = `${i}-${f.name}`;
                          const pct = uploadProgress[key];
                          return (
                            <li key={key} className="flex items-center justify-between gap-2">
                              <span className="truncate">{f.name}</span>
                              <span>{pct != null ? `${pct}%` : "pendente"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={uploading || filesToUpload.length === 0}
                        onClick={uploadAttachments}
                        className="rounded-lg bg-blue-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
                      >
                        {uploading ? "Enviando..." : "Enviar anexos"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {(card.media_urls ?? []).map((url) =>
                      isVideoUrl(url) ? (
                        <div key={url} className="rounded-lg border border-slate-200 bg-white p-2">
                          <video src={url} controls className="w-full rounded-lg bg-black" />
                          <button
                            type="button"
                            onClick={() => removeAttachment(url)}
                            className="mt-2 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Apagar anexo
                          </button>
                        </div>
                      ) : isImageUrl(url) ? (
                        <div key={url} className="rounded-lg border border-slate-200 bg-white p-2">
                          <a href={url} target="_blank" rel="noreferrer" className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="max-h-48 w-full rounded-lg object-contain" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeAttachment(url)}
                            className="mt-2 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Apagar anexo
                          </button>
                        </div>
                      ) : (
                        <div key={url} className="rounded-lg border border-slate-200 bg-white p-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg p-2 text-sm text-blue-900 hover:bg-blue-50"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="line-clamp-1">{fileNameFromUrl(url)}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => removeAttachment(url)}
                            className="mt-2 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Apagar anexo
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                  {(!card.media_urls || card.media_urls.length === 0) && (
                    <p className="text-sm text-slate-500">Nenhum anexo.</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-slate-50 md:w-80 md:border-l md:border-t-0">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Comentários</h3>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <ul className="max-h-48 flex-1 space-y-3 overflow-y-auto p-4 md:max-h-none">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-2 text-sm shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-slate-500">
                      {c.autor || "Anônimo"} · {formatDateTimeBR(c.created_at)}
                      {isCommentEdited(c) ? " · editado" : ""}
                    </p>
                    {canEditComment(c) && editingCommentId !== c.id ? (
                      <button
                        type="button"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Editar comentário"
                        onClick={() => setEditingCommentId(c.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  {editingCommentId === c.id ? (
                    <div className="mt-2 space-y-2">
                      <CommentRichEditor
                        key={`edit-${c.id}`}
                        ref={editCommentEditorRef}
                        boardId={boardId}
                        cardId={cardId!}
                        initialHTML={c.texto}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-md bg-blue-900 px-2 py-1 text-xs font-medium text-white hover:bg-blue-950"
                          onClick={() => void saveCommentEdit(c.id)}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          onClick={() => setEditingCommentId(null)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <CommentDisplay texto={c.texto} />
                  )}
                </li>
              ))}
              {comments.length === 0 ? <li className="text-sm text-slate-500">Nenhum comentário.</li> : null}
            </ul>
            <form onSubmit={submitComment} className="border-t border-slate-200 p-4">
              <p className="text-xs text-slate-600">
                Comentando como <span className="font-semibold text-slate-800">{user?.name ?? "—"}</span>
              </p>
              <label className="mt-2 block text-xs font-medium text-slate-600">
                Comentário (texto formatado; cole prints com Ctrl+V)
                {cardId ? (
                  <CommentRichEditor key={cardId} ref={commentEditorRef} boardId={boardId} cardId={cardId} />
                ) : null}
              </label>
              <button
                type="submit"
                className="mt-2 w-full rounded-lg bg-blue-900 py-2 text-sm font-medium text-white hover:bg-blue-950"
              >
                Publicar
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
