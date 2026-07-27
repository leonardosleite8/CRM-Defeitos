"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  BarChart3,
  ClipboardList,
  Settings,
  LogOut,
  ScrollText,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth/session";

const nav = [
  { href: "/", label: "Quadros", icon: LayoutGrid },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/plano-de-acao", label: "Plano de ação", icon: ClipboardList },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  const pathname = usePathname();

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
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-950 ${
                  active ? "bg-blue-950 text-white" : "text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-800 p-3">
          {user ? (
            <div className="space-y-2">
              <div className="px-2">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
              <Link
                href="/configuracoes"
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-blue-950"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </Link>
              {user.role === "admin" ? (
                <Link
                  href="/logs"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-blue-950"
                >
                  <ScrollText className="h-4 w-4" />
                  Logs
                </Link>
              ) : null}
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-blue-950"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <h1 className="text-sm font-semibold text-slate-900">Defeitos de Produtos</h1>
          <div className="flex flex-wrap justify-end gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-800"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/configuracoes"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-800"
            >
              Config
            </Link>
            {user?.role === "admin" ? (
              <Link
                href="/logs"
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-800"
              >
                Logs
              </Link>
            ) : null}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
