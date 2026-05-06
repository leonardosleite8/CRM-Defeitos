import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, BarChart3 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100 md:flex md:flex-col">
        <div className="border-b border-slate-800 px-4 py-5">
          <Image
            src="/urano-logo.png"
            alt="Logo Urano"
            width={130}
            height={30}
            className="h-auto w-32 brightness-0 invert"
            priority
          />
          <h1 className="mt-1 text-lg font-semibold leading-tight">Defeitos de Produtos</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-blue-950"
          >
            <LayoutGrid className="h-4 w-4" />
            Quadros
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-blue-950"
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <h1 className="text-sm font-semibold text-slate-900">Defeitos de Produtos</h1>
          <div className="flex gap-2">
            <Link href="/" className="rounded-md bg-blue-900 px-3 py-1.5 text-xs font-medium text-white">
              Quadros
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              Dashboard
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

