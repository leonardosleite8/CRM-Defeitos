from pathlib import Path
import importlib.util

spec = importlib.util.spec_from_file_location(
    "prep", Path("scripts/prepare_plano_template.py")
)
m = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(m)

src = Path("templates/_from_doc.docx")
dest = Path("templates/plano-de-acao.docx")
if not src.exists():
    raise SystemExit(f"missing {src}")
m.clean_docx(src, dest)
print("template ready", dest, "size", dest.stat().st_size)
