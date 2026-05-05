import { createClient } from "@supabase/supabase-js";

/** Cliente servidor (anon). Em produção, prefira RLS + usuário autenticado. */
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key);
}
