"""Restaura o template a partir do DOCX do usuário, preservando formatação/espaços.
Apenas: unifica placeholders partidos e garante {{solucao}} sem apagar vazios do meio.
"""
from __future__ import annotations

import glob
import html
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(r"c:\Users\leonardo\Desktop\defeitos-produtos")
DOWNLOADS = Path(r"c:\Users\leonardo\Downloads")
DEST = ROOT / "templates" / "plano-de-acao.docx"


def find_source() -> Path:
    files = [
        Path(p)
        for p in glob.glob(str(DOWNLOADS / "Plano*.docx"))
        if "plano-acao-" not in Path(p).name.lower()
    ]
    if not files:
        raise SystemExit("Plano de Ação.docx não encontrado em Downloads")
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0]


def fix_split_placeholders(xml: str) -> str:
    """Une só {{tags}} partidos em várias w:t, sem mexer em parágrafos vazios."""

    def fix_para(match: re.Match[str]) -> str:
        p = match.group(0)
        texts = list(re.finditer(r"<w:t([^>]*)>([\s\S]*?)</w:t>", p))
        if not texts:
            return p
        joined = "".join(m.group(2) for m in texts)
        if "{{" not in joined or "}}" not in joined:
            return p
        placeholders = re.findall(r"\{\{[a-zA-Z0-9_]+\}\}", joined)
        if not placeholders:
            return p
        if all(any(ph in m.group(2) for m in texts) for ph in placeholders):
            return p

        first = True

        def repl(m: re.Match[str]) -> str:
            nonlocal first
            attrs = m.group(1)
            if first:
                first = False
                if ("xml:space" not in attrs) and (joined[:1].isspace() or joined[-1:].isspace()):
                    attrs = f'{attrs} xml:space="preserve"'
                return f"<w:t{attrs}>{joined}</w:t>"
            return f"<w:t{attrs}></w:t>"

        return re.sub(r"<w:t([^>]*)>([\s\S]*?)</w:t>", repl, p)

    return re.sub(r"<w:p\b[\s\S]*?</w:p>", fix_para, xml)


def ensure_solucao(xml: str) -> str:
    if "{{solucao}}" in xml:
        return xml

    paras = re.findall(r"<w:p\b[\s\S]*?</w:p>", xml)

    def plain(p: str) -> str:
        return html.unescape(re.sub(r"<[^>]+>", "", p)).strip()

    sol_i = None
    for i, p in enumerate(paras):
        pl = plain(p)
        if re.search(r"Solu", pl, re.I) and "{{" not in pl:
            sol_i = i
            break
    if sol_i is None:
        return xml

    # Prefere preencher o próximo parágrafo vazio (preserva espaçamento/estilo dele)
    for j in range(sol_i + 1, min(sol_i + 8, len(paras))):
        if plain(paras[j]):
            continue
        nxt = paras[j]
        if re.search(r"<w:t[^>]*>\s*</w:t>", nxt):
            nxt2 = re.sub(r"(<w:t[^>]*>)\s*(</w:t>)", r"\1{{solucao}}\2", nxt, count=1)
        elif "<w:r" in nxt:
            nxt2 = re.sub(r"(<w:r\b[^>]*>)", r"\1<w:t>{{solucao}}</w:t>", nxt, count=1)
        else:
            nxt2 = nxt.replace("</w:p>", "<w:r><w:t>{{solucao}}</w:t></w:r></w:p>", 1)
        return xml.replace(nxt, nxt2, 1)

    # Fallback: inserir parágrafo logo após o rótulo Solução
    insert = "<w:p><w:r><w:t>{{solucao}}</w:t></w:r></w:p>"
    return xml.replace(paras[sol_i], paras[sol_i] + insert, 1)


def main() -> None:
    src = find_source()
    print("SRC", src, src.stat().st_size)

    # limpa artefatos antigos, mantém só o template oficial
    tdir = DEST.parent
    for p in tdir.glob("*"):
        if p.name.startswith("_") or p.suffix in {".doc", ".txt"}:
            if p.is_file():
                p.unlink()
            elif p.is_dir():
                shutil.rmtree(p)

    shutil.copy2(src, DEST)

    tmp = tdir / "_tmp_restore"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()
    with zipfile.ZipFile(DEST) as z:
        z.extractall(tmp)

    xml_path = tmp / "word" / "document.xml"
    xml = xml_path.read_text(encoding="utf-8")
    xml = fix_split_placeholders(xml)
    xml = ensure_solucao(xml)
    xml_path.write_text(xml, encoding="utf-8")

    DEST.unlink()
    with zipfile.ZipFile(DEST, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for p in tmp.rglob("*"):
            if p.is_file():
                z.write(p, p.relative_to(tmp).as_posix())
    shutil.rmtree(tmp)

    with zipfile.ZipFile(DEST) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    paras = re.findall(r"<w:p\b[\s\S]*?</w:p>", xml)
    empty = sum(1 for p in paras if not html.unescape(re.sub(r"<[^>]+>", "", p)).strip())
    ph = re.findall(r"\{\{[a-zA-Z0-9_]+\}\}", xml)
    print("paras", len(paras), "empty_kept", empty)
    print("placeholders", ph)
    print("OK", DEST, DEST.stat().st_size)


if __name__ == "__main__":
    main()
