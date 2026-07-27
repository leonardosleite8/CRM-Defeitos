"""Converte Plano de Ação.doc -> templates/plano-de-acao.docx e unifica placeholders {{...}} em um único w:t."""
from __future__ import annotations

import glob
import os
import re
import shutil
import zipfile
from pathlib import Path

ROOT = Path(r"c:\Users\leonardo\Desktop\defeitos-produtos")
DOWNLOADS = Path(r"c:\Users\leonardo\Downloads")
TEMPLATES = ROOT / "templates"
TEMPLATES.mkdir(exist_ok=True)
DOCX_OUT = TEMPLATES / "plano-de-acao.docx"
TMP_DOCX = TEMPLATES / "_from_doc.docx"


def find_latest(pattern: str) -> Path | None:
    files = [Path(p) for p in glob.glob(str(DOWNLOADS / pattern))]
    if not files:
        return None
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0]


def convert_doc_to_docx(doc_path: Path, docx_path: Path) -> bool:
    try:
        import win32com.client  # type: ignore
    except ImportError:
        win32com = None

    if win32com is None:
        # Fallback: Word COM via powershell
        ps = f"""
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Open('{doc_path.as_posix()}')
# 16 = wdFormatXMLDocument (.docx)
$doc.SaveAs([ref] '{docx_path.as_posix()}', [ref] 16)
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
"""
        import subprocess

        r = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps],
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            print("CONVERT_FAIL", r.stderr[-500:])
            return False
        return docx_path.exists()

    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    try:
        doc = word.Documents.Open(str(doc_path))
        doc.SaveAs(str(docx_path), FileFormat=16)
        doc.Close()
    finally:
        word.Quit()
    return docx_path.exists()


def fix_placeholders_in_xml(xml: str) -> str:
    """Une textos de <w:t> que formam {{campo}} partido em várias runs."""

    def repl_paragraph(match: re.Match[str]) -> str:
        p = match.group(0)
        # Extrai sequência de textos
        texts = re.findall(r"<w:t([^>]*)>(.*?)</w:t>", p, flags=re.DOTALL)
        if not texts:
            return p
        joined = "".join(t for _, t in texts)
        if "{{" not in joined or "}}" not in joined:
            return p

        # Substitui cada placeholder completo nas runs: reconstrói só se partido
        placeholders = re.findall(r"\{\{[a-zA-Z0-9_]+\}\}", joined)
        if not placeholders:
            return p

        # Se todos os placeholders já estão íntegros em algum w:t, ok
        intact = True
        for ph in placeholders:
            if not re.search(rf"<w:t[^>]*>[^<]*{re.escape(ph)}[^<]*</w:t>", p):
                intact = False
                break
        if intact:
            return p

        # Estratégia: juntar todos os w:t de um parágrafo que participam do placeholder
        # em um único w:t com o texto completo do parágrafo (preserva 1ª formatação).
        full_text = joined
        # Encontra primeiro w:t e coloca o texto inteiro nele; esvazia os demais
        first = True

        def replace_t(m: re.Match[str]) -> str:
            nonlocal first
            attrs, _old = m.group(1), m.group(2)
            if first:
                first = False
                # Preserve xml:space if needed
                if "xml:space" not in attrs and (full_text.startswith(" ") or full_text.endswith(" ") or "\n" in full_text):
                    attrs = (attrs or "") + ' xml:space="preserve"'
                return f"<w:t{attrs}>{full_text}</w:t>"
            return f"<w:t{attrs}></w:t>"

        return re.sub(r"<w:t([^>]*)>(.*?)</w:t>", replace_t, p, flags=re.DOTALL)

    return re.sub(r"<w:p\b[\s\S]*?</w:p>", repl_paragraph, xml)


def clean_docx(src: Path, dest: Path) -> None:
    tmp_dir = TEMPLATES / "_docx_fix"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir()
    with zipfile.ZipFile(src, "r") as z:
        z.extractall(tmp_dir)
    doc_xml = tmp_dir / "word" / "document.xml"
    xml = doc_xml.read_text(encoding="utf-8")
    fixed = fix_placeholders_in_xml(xml)
    doc_xml.write_text(fixed, encoding="utf-8")
    if dest.exists():
        dest.unlink()
    with zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for path in tmp_dir.rglob("*"):
            if path.is_file():
                z.write(path, path.relative_to(tmp_dir).as_posix())
    shutil.rmtree(tmp_dir)
    # verify
    with zipfile.ZipFile(dest) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    plain = re.sub(r"<[^>]+>", "", xml)
    found = re.findall(r"\{\{[a-zA-Z0-9_]+\}\}", plain)
    print("PLACEHOLDERS:", found)


def main() -> None:
    doc = find_latest("Plano*.doc")
    # Prefer real .doc (not .docx)
    docs = [
        Path(p)
        for p in glob.glob(str(DOWNLOADS / "Plano*.doc"))
        if not p.lower().endswith(".docx")
    ]
    docs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    docx_files = [Path(p) for p in glob.glob(str(DOWNLOADS / "Plano*.docx"))]
    docx_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    source_docx: Path | None = None
    if docs:
        print("Using DOC:", docs[0])
        if TMP_DOCX.exists():
            TMP_DOCX.unlink()
        ok = convert_doc_to_docx(docs[0], TMP_DOCX)
        if ok:
            source_docx = TMP_DOCX
        else:
            print("DOC convert failed, falling back to DOCX sibling")
    if source_docx is None and docx_files:
        print("Using DOCX:", docx_files[0])
        source_docx = docx_files[0]
    if source_docx is None:
        raise SystemExit("No template found")

    clean_docx(source_docx, DOCX_OUT)
    print("Wrote", DOCX_OUT)
    if TMP_DOCX.exists():
        TMP_DOCX.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
