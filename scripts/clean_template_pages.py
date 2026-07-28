import zipfile
import re
import html
import shutil
from pathlib import Path

out = Path("templates/plano-de-acao.docx")
tmp = Path("templates/_clean_pages")
if tmp.exists():
    shutil.rmtree(tmp)
tmp.mkdir()

with zipfile.ZipFile(out) as z:
    z.extractall(tmp)

xml_path = tmp / "word" / "document.xml"
xml = xml_path.read_text(encoding="utf-8")

print("page_br", len(re.findall(r'w:type="page"', xml)))
print("sectPr", len(re.findall(r"<w:sectPr", xml)))

paras = re.findall(r"<w:p\b[\s\S]*?</w:p>", xml)
print("paras", len(paras))


def plain_of(p: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", p)).strip()


for i, p in enumerate(paras):
    pl = plain_of(p)
    print(f"{i:02d}", repr(pl[:70]) if pl else "<EMPTY>", "break" if "w:type=\"page\"" in p else "")

# Remove trailing empty paragraphs before final sectPr (keep at most 0)
body_match = re.search(r"(<w:body\b[^>]*>)([\s\S]*)(</w:body>)", xml)
if not body_match:
    raise SystemExit("no body")

prefix, body, suffix = body_match.group(1), body_match.group(2), body_match.group(3)

# Split body into paragraphs + optional trailing sectPr
sect = re.search(r"(<w:sectPr\b[\s\S]*?</w:sectPr>)\s*$", body)
sect_xml = sect.group(1) if sect else ""
main = body[: sect.start()] if sect else body

paras = re.findall(r"<w:p\b[\s\S]*?</w:p>", main)
# Drop empty paragraphs at the end
while paras and not plain_of(paras[-1]):
    paras.pop()

# Also collapse consecutive empty paragraphs in the middle to max 1
cleaned = []
empty_run = 0
for p in paras:
    if not plain_of(p):
        empty_run += 1
        if empty_run <= 1:
            cleaned.append(p)
    else:
        empty_run = 0
        cleaned.append(p)

# Prefer no empty paras at all between fields for single page - keep max 0 consecutive empties
cleaned2 = []
empty_run = 0
for p in cleaned:
    if not plain_of(p):
        empty_run += 1
        # skip empty paragraphs entirely to avoid pushing to page 2
        continue
    empty_run = 0
    cleaned2.append(p)

new_body = "".join(cleaned2) + sect_xml
# Ensure sectPr is not inside a paragraph wrongly; Word expects sectPr as last child of body
# If sectPr was inside last paragraph originally, keep as-is from extraction

xml2 = xml[: body_match.start()] + prefix + new_body + suffix + xml[body_match.end() :]
xml_path.write_text(xml2, encoding="utf-8")

# Also tighten section margins slightly if huge bottom margin exists? read first
if sect_xml:
    print("SECT", re.sub(r"><", ">\n<", sect_xml)[:600])

out.unlink()
with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for p in tmp.rglob("*"):
        if p.is_file():
            z.write(p, p.relative_to(tmp).as_posix())
shutil.rmtree(tmp)

with zipfile.ZipFile(out) as z:
    xml = z.read("word/document.xml").decode("utf-8")
paras = re.findall(r"<w:p\b[\s\S]*?</w:p>", xml)
print("AFTER paras", len(paras), "empty", sum(1 for p in paras if not plain_of(p)))
for i, p in enumerate(paras):
    pl = plain_of(p)
    if pl:
        print(f"{i:02d}", pl[:70])
print("done")
