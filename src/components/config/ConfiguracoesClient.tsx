"use client";

import { useState, useTransition } from "react";
import type { SessionUser } from "@/lib/auth/session";
import {
  changePasswordAction,
  changeNameAction,
  createUserAction,
  toggleUserActiveAction,
  updateUserRoleAction,
  updateUserProfileAction,
} from "@/app/actions/auth";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "observer";
  active: boolean;
  created_at: string;
};

export function ConfiguracoesClient({
  session,
  users,
}: {
  session: SessionUser;
  users: UserRow[];
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-600">Perfil, senha e usuários.</p>
      </div>

      {msg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{err}</div>
      ) : null}

      {session.role === "observer" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Perfil Observador</h2>
          <p className="mt-1 text-sm text-slate-600">
            Você pode visualizar quadros, cards, dashboard, entregas e plano de ação. Não é possível
            alterar dados, comentar, exportar ou baixar arquivos.
          </p>
        </section>
      ) : (
      <>
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Meu nome</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          action={(fd) => {
            setErr(null);
            setMsg(null);
            startTransition(async () => {
              const res = await changeNameAction(fd);
              if (res?.error) setErr(res.error);
              else {
                setMsg("Nome atualizado.");
                window.location.reload();
              }
            });
          }}
        >
          <label className="text-xs font-medium text-slate-600">
            Nome
            <input
              name="name"
              defaultValue={session.name}
              required
              className="mt-1 block min-w-[220px] rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
          >
            Salvar nome
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Minha senha</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          action={(fd) => {
            setErr(null);
            setMsg(null);
            startTransition(async () => {
              const res = await changePasswordAction(fd);
              if (res?.error) setErr(res.error);
              else setMsg("Senha atualizada.");
            });
          }}
        >
          <label className="text-xs font-medium text-slate-600">
            Nova senha
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
          >
            Salvar senha
          </button>
        </form>
      </section>
      </>
      )}

      {session.role === "admin" ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Usuários</h2>
            <p className="mt-1 text-xs text-slate-500">
              Administradores podem gerenciar usuários comuns e promover novos admins. Não é possível
              alterar permissões nem desativar outros administradores.
            </p>
          </div>
          <form
            className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-4"
            action={(fd) => {
              setErr(null);
              setMsg(null);
              startTransition(async () => {
                const res = await createUserAction(fd);
                if (res?.error) setErr(res.error);
                else {
                  setMsg("Usuário criado.");
                  window.location.reload();
                }
              });
            }}
          >
            <label className="text-xs font-medium text-slate-600">
              Nome
              <input name="name" required className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              E-mail
              <input
                name="email"
                type="email"
                required
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Senha
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Perfil
              <select name="role" className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="user">Usuário</option>
                <option value="observer">Observador</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-950 disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>

          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Nome</th>
                <th className="py-2">E-mail</th>
                <th className="py-2">Perfil</th>
                <th className="py-2">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isAdminRow = u.role === "admin";
                const isSelf = u.id === session.id;
                const editing = editingId === u.id;

                return (
                  <tr key={u.id} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      {editing ? (
                        <input
                          form={`edit-user-${u.id}`}
                          name="name"
                          defaultValue={u.name}
                          required
                          className="w-full min-w-[8rem] rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {editing ? (
                        <input
                          form={`edit-user-${u.id}`}
                          name="email"
                          type="email"
                          defaultValue={u.email}
                          required
                          className="w-full min-w-[10rem] rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isAdminRow ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                          Admin
                          {isSelf ? " (você)" : ""}
                        </span>
                      ) : (
                        <select
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                          defaultValue={u.role}
                          disabled={pending}
                          onChange={(e) => {
                            const next =
                              e.target.value === "admin"
                                ? "admin"
                                : e.target.value === "observer"
                                  ? "observer"
                                  : "user";
                            if (next === u.role) return;
                            startTransition(async () => {
                              setErr(null);
                              setMsg(null);
                              try {
                                await updateUserRoleAction(u.id, next);
                                setMsg(
                                  next === "admin"
                                    ? `${u.name} agora é administrador.`
                                    : `Perfil de ${u.name} atualizado.`,
                                );
                                window.location.reload();
                              } catch (ex) {
                                setErr(ex instanceof Error ? ex.message : "Erro");
                                e.target.value = u.role;
                              }
                            });
                          }}
                        >
                          <option value="user">Usuário</option>
                          <option value="observer">Observador</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2">{u.active ? "Ativo" : "Inativo"}</td>
                    <td className="py-2 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {!isAdminRow ? (
                          <>
                            {editing ? (
                              <>
                                <input type="hidden" form={`edit-user-${u.id}`} name="userId" value={u.id} />
                                <button
                                  type="submit"
                                  form={`edit-user-${u.id}`}
                                  disabled={pending}
                                  className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-slate-500 hover:underline"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="text-xs font-medium text-blue-900 hover:underline"
                                onClick={() => setEditingId(u.id)}
                              >
                                Editar
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-xs font-medium text-blue-900 hover:underline"
                              disabled={pending}
                              onClick={() => {
                                startTransition(async () => {
                                  setErr(null);
                                  try {
                                    await toggleUserActiveAction(u.id, !u.active);
                                    window.location.reload();
                                  } catch (e) {
                                    setErr(e instanceof Error ? e.message : "Erro");
                                  }
                                });
                              }}
                            >
                              {u.active ? "Desativar" : "Ativar"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Protegido</span>
                        )}
                      </div>
                      {!isAdminRow ? (
                        <form
                          id={`edit-user-${u.id}`}
                          className="hidden"
                          action={(fd) => {
                            setErr(null);
                            setMsg(null);
                            startTransition(async () => {
                              const res = await updateUserProfileAction(fd);
                              if (res?.error) setErr(res.error);
                              else {
                                setMsg("Dados do usuário atualizados.");
                                setEditingId(null);
                                window.location.reload();
                              }
                            });
                          }}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
