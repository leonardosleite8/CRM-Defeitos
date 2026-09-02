export default function EntregasLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
      <p className="text-sm text-slate-500">Carregando entregas…</p>
    </div>
  );
}
