export function ConfigAlert() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <p className="font-semibold">Configure o Supabase</p>
      <p className="mt-1 text-sm">
        Copie <code className="rounded bg-amber-100 px-1">.env.example</code> para{" "}
        <code className="rounded bg-amber-100 px-1">.env.local</code> e preencha{" "}
        <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Em seguida execute o SQL em{" "}
        <code className="rounded bg-amber-100 px-1">supabase/migrations/001_init.sql</code> no editor SQL do projeto.
      </p>
    </div>
  );
}
