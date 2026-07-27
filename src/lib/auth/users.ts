import { createServerSupabase } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import type { SessionUser } from "@/lib/auth/session";

export type AppUserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
  active: boolean;
  created_at: string;
};

export async function ensureDefaultAdmin() {
  const supabase = createServerSupabase();
  const { count, error } = await supabase.from("app_users").select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const password_hash = await hashPassword("admin123");
  const { error: insertError } = await supabase.from("app_users").insert({
    name: "Leonardo",
    email: "leonardo@urano.com.br",
    password_hash,
    role: "admin",
    active: true,
  });
  if (insertError) throw new Error(insertError.message);
}

export async function findUserByEmail(email: string): Promise<AppUserRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AppUserRow | null) ?? null;
}

export async function writeAuditLog(input: {
  user?: SessionUser | null;
  action: string;
  detail?: string;
}) {
  const supabase = createServerSupabase();
  await supabase.from("app_audit_logs").insert({
    user_id: input.user?.id ?? null,
    user_email: input.user?.email ?? null,
    action: input.action,
    detail: input.detail ?? null,
  });
}

export async function listUsers(): Promise<Omit<AppUserRow, "password_hash">[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("app_users")
    .select("id,name,email,role,active,created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Omit<AppUserRow, "password_hash">[];
}

export async function listAuditLogs(limit = 100) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("app_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
