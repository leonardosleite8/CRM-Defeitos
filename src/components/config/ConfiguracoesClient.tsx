"use client";

import { useState, useTransition } from "react";
import type { SessionUser } from "@/lib/auth/session";
import {
  changePasswordAction,
  changeNameAction,
  createUserAction,
  toggleUserActiveAction,
} from "@/app/actions/auth";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
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

      {session.role === "admin" ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Usuários</h2>
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
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">{u.active ? "Ativo" : "Inativo"}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="text-xs font-medium text-blue-900 hover:underline"
                      onClick={() => {
                        startTransition(async () => {
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
