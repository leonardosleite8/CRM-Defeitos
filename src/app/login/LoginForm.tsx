"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto w-full max-w-sm space-y-5"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const res = await loginAction(fd);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-blue-100">
          Seu e-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="Digite seu e-mail"
          className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:ring-blue-300"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-blue-100">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Digite sua senha"
          className="w-full rounded-md border-0 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-2 ring-transparent placeholder:text-slate-400 focus:ring-blue-300"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="inline-flex items-center gap-2 text-blue-100">
          <input type="checkbox" name="remember" className="rounded border-blue-200" />
          Lembrar-me
        </label>
        <a href="mailto:suporte@urano.com.br?subject=Recuperar%20senha" className="text-blue-200 hover:text-white">
          Recuperar senha
        </a>
      </div>
      {error ? (
        <p className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md py-3 text-sm font-bold uppercase tracking-wide text-white hover:brightness-95 disabled:opacity-60"
        style={{ backgroundColor: "color-mix(in srgb, var(--urano-blue) 85%, black)" }}
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export function LoginPageView() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-white">
      {/* Painel de marca (claro) */}
      <div className="relative z-10 flex w-full flex-col justify-center px-6 py-12 md:w-[42%]">
        <div className="mx-auto w-full max-w-[720px]">
          {/* Logo monochrome no mesmo azul do painel (--urano-blue) */}
          <div
            className="aspect-[840/198] w-full max-w-[720px]"
            role="img"
            aria-label="Urano"
            style={{
              backgroundColor: "var(--urano-blue)",
              WebkitMaskImage: "url(/urano-logo.png)",
              WebkitMaskSize: "contain",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskPosition: "left center",
              maskImage: "url(/urano-logo.png)",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "left center",
            }}
          />
          <p className="mt-2 text-sm font-medium md:text-base" style={{ color: "var(--urano-blue)" }}>
            Defeitos de Produtos
          </p>
        </div>
      </div>

      {/* Painel do formulário — mesmo azul do logo */}
      <div
        className="absolute inset-y-0 right-0 z-0 w-full md:w-[62%]"
        style={{
          backgroundColor: "var(--urano-blue)",
          clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0% 100%)",
        }}
      />
      <div className="relative z-10 flex w-full flex-col justify-center px-8 py-12 md:ml-auto md:w-[55%]">
        <LoginForm />
      </div>
    </div>
  );
}
