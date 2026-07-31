"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getSession } from "@/lib/auth/getSession";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  ensureDefaultAdmin,
  findUserByEmail,
  listAuditLogs,
  listUsers,
  writeAuditLog,
} from "@/lib/auth/users";
import { createServerSupabase } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = String(formData.get("remember") ?? "") === "on";

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  try {
    await ensureDefaultAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation.*app_users|does not exist|schema cache/i.test(msg)) {
      return {
        error:
          "Tabelas de autenticação ainda não existem. Execute a migration 011_auth_users_logs.sql no Supabase.",
      };
    }
    return { error: msg };
  }

  const user = await findUserByEmail(email);
  if (!user || !user.active) {
    await writeAuditLog({ action: "login_failed", detail: email });
    return { error: "Credenciais inválidas." };
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    await writeAuditLog({ action: "login_failed", detail: email });
    return { error: "Credenciais inválidas." };
  }

  const sessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  const token = await createSessionToken(sessionUser, remember);
  const jar = await cookies();
  jar.set(sessionCookieOptions(token, remember));
  await writeAuditLog({ user: sessionUser, action: "login", detail: "ok" });
  redirect("/");
}

export async function logoutAction() {
  const user = await getSession();
  if (user) {
    await writeAuditLog({ user, action: "logout" });
  }
  const jar = await cookies();
  jar.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  redirect("/login");
}

export async function createUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { error: "Sem permissão." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "user") === "admin" ? "admin" : "user";
  if (!name || !email || password.length < 6) {
    return { error: "Preencha nome, e-mail e senha (mín. 6 caracteres)." };
  }
  const supabase = createServerSupabase();
  const password_hash = await hashPassword(password);
  const { error } = await supabase.from("app_users").insert({
    name,
    email,
    password_hash,
    role,
    active: true,
  });
  if (error) return { error: error.message };
  await writeAuditLog({ user: session, action: "user_create", detail: email });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("Sem permissão.");
  }
  if (session.id === userId && !active) {
    throw new Error("Você não pode desativar a si mesmo.");
  }
  const supabase = createServerSupabase();
  const { error } = await supabase.from("app_users").update({ active }).eq("id", userId);
  if (error) throw new Error(error.message);
  await writeAuditLog({
    user: session,
    action: active ? "user_activate" : "user_deactivate",
    detail: userId,
  });
  revalidatePath("/configuracoes");
}

export async function changePasswordAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Senha mínima de 6 caracteres." };
  const supabase = createServerSupabase();
  const password_hash = await hashPassword(password);
  const { error } = await supabase
    .from("app_users")
    .update({ password_hash })
    .eq("id", session.id);
  if (error) return { error: error.message };
  await writeAuditLog({ user: session, action: "password_change" });
  return { ok: true };
}

export async function changeNameAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Não autenticado." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome." };
  const supabase = createServerSupabase();
  const { error } = await supabase.from("app_users").update({ name }).eq("id", session.id);
  if (error) return { error: error.message };

  const remember = true;
  const token = await createSessionToken(
    { id: session.id, email: session.email, name, role: session.role },
    remember,
  );
  const jar = await cookies();
  jar.set(sessionCookieOptions(token, remember));
  await writeAuditLog({ user: { ...session, name }, action: "name_change", detail: name });
  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { ok: true };
}

export async function fetchConfigData() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  const users = session.role === "admin" ? await listUsers() : [];
  return { session, users };
}

export async function fetchLogsData() {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado.");
  if (session.role !== "admin") throw new Error("Sem permissão.");
  const logs = await listAuditLogs(500);
  return { session, logs };
}
