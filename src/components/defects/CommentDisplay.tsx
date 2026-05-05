"use client";

import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

const SANITIZE: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "h2",
    "h3",
    "blockquote",
    "code",
    "pre",
    "span",
    "div",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "class", "target", "rel"],
};

function looksLikeHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s.trim());
}

export function CommentDisplay({ texto }: { texto: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!texto.trim()) {
    return <p className="mt-1 text-slate-400">(vazio)</p>;
  }

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !looksLikeHtml(texto)) return;
    const imgs = root.querySelectorAll("img");
    const cleanups: (() => void)[] = [];
    imgs.forEach((img) => {
      const handler = () => setLightboxUrl((img as HTMLImageElement).src);
      img.addEventListener("click", handler);
      cleanups.push(() => img.removeEventListener("click", handler));
    });
    return () => cleanups.forEach((fn) => fn());
  }, [texto]);

  if (!looksLikeHtml(texto)) {
    return <p className="mt-1 whitespace-pre-wrap text-slate-800">{texto}</p>;
  }

  const safe = DOMPurify.sanitize(texto, SANITIZE);

  return (
    <>
      <div
        ref={containerRef}
        className="comment-display prose prose-sm mt-1 max-w-none text-slate-800 [&_img]:max-h-32 [&_img]:cursor-zoom-in [&_img]:rounded-md [&_img]:border [&_img]:border-slate-200"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
      {lightboxUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center border-0 bg-black/85 p-4"
          onClick={() => setLightboxUrl(null)}
          aria-label="Fechar imagem"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="" className="max-h-[92vh] max-w-full object-contain shadow-2xl" />
        </button>
      ) : null}
    </>
  );
}
