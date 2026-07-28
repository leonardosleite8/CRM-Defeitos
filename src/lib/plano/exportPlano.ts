import { flattenForExport } from "@/lib/exportFlatten";
import { formatDateBR, formatDateTimeBR } from "@/lib/date";
import type { DefectCardRow, DefectCommentRow } from "@/lib/types/db";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import JSZip from "jszip";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return flattenForExport(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "plano"
  );
}

export type PlanoExportCard = {
  card: DefectCardRow;
  comments: DefectCommentRow[];
};

function buildData(item: PlanoExportCard, linkSistema: string) {
  const { card, comments } = item;
  const comentarios =
    comments.length === 0
      ? "—"
      : comments
          .map((c) => {
            const when = formatDateTimeBR(c.created_at);
            const autor = c.autor?.trim() || "Anônimo";
            return `[${when}] ${autor}: ${stripHtml(c.texto)}`;
          })
          .join("\n\n");

  return {
    titulo: flattenForExport(card.titulo) || "—",
    responsavel: flattenForExport(card.responsavel) || "—",
    setor_responsavel: flattenForExport(card.setor_responsavel) || "—",
    previsao_conclusao: formatDateBR(card.previsao_conclusao),
    status: flattenForExport(card.status) || "—",
    modelo: flattenForExport(card.modelo_produto) || "—",
    linha: flattenForExport(card.linha) || "—",
    descricao: stripHtml(card.descricao) || "—",
    solucao: stripHtml(card.solucao) || "—",
    comentarios,
    link_sistema: linkSistema || "—",
  };
}

/** Une {{tags}} partidos em várias runs do Word, sem alterar o restante do XML. */
function fixSplitPlaceholders(xml: string): string {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const texts = [...paragraph.matchAll(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g)];
    if (!texts.length) return paragraph;
    const joined = texts.map((m) => m[2]).join("");
    if (!joined.includes("{{") || !joined.includes("}}")) return paragraph;

    const placeholders = joined.match(/\{\{[a-zA-Z0-9_]+\}\}/g) ?? [];
    if (!placeholders.length) return paragraph;

    const allIntact = placeholders.every((ph) =>
      texts.some((m) => m[2].includes(ph)),
    );
    if (allIntact) return paragraph;

    let first = true;
    return paragraph.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (_m, attrs: string) => {
      if (first) {
        first = false;
        const needSpace = /^\s|\s$/.test(joined) || joined.includes("\n");
        const nextAttrs =
          needSpace && !attrs.includes("xml:space")
            ? `${attrs} xml:space="preserve"`
            : attrs;
        return `<w:t${nextAttrs}>${joined}</w:t>`;
      }
      return `<w:t${attrs}></w:t>`;
    });
  });
}

/** Remove só o que causa página em branco desnecessária, sem mexer no espaçamento do meio. */
function stripUnnecessaryBlankLastPage(xml: string): string {
  // Quebras de página explícitas nunca são desejadas neste relatório
  let next = xml
    .replace(/<w:br\b[^>]*w:type="page"[^/]*\/>/g, "")
    .replace(/<w:lastRenderedPageBreak\b[^/]*\/>/g, "");

  const bodyMatch = next.match(/(<w:body\b[^>]*>)([\s\S]*)(<\/w:body>)/);
  if (!bodyMatch) return next;

  const [, bodyOpen, bodyInner, bodyClose] = bodyMatch;
  const sectMatch = bodyInner.match(/(<w:sectPr\b[\s\S]*?<\/w:sectPr>)\s*$/);
  const sectXml = sectMatch?.[1] ?? "";
  const main = sectMatch ? bodyInner.slice(0, sectMatch.index) : bodyInner;
  const paragraphs = main.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? [];

  const plainOf = (p: string) =>
    p
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

  // Mantém todos os parágrafos (inclusive vazios do meio = formatação do usuário).
  // Só corta vazios DEPOIS do último parágrafo com texto.
  let lastContent = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    if (plainOf(paragraphs[i])) lastContent = i;
  }
  if (lastContent < 0) return next;

  const kept = paragraphs.slice(0, lastContent + 1);
  const newBody = `${bodyOpen}${kept.join("")}${sectXml}${bodyClose}`;
  return next.replace(bodyMatch[0], newBody);
}

function loadTemplateZip(): PizZip {
  const templatePath = path.join(process.cwd(), "templates", "plano-de-acao.docx");
  const zip = new PizZip(fs.readFileSync(templatePath));
  const docFile = zip.file("word/document.xml");
  if (docFile) {
    const fixed = fixSplitPlaceholders(docFile.asText());
    zip.file("word/document.xml", fixed);
  }
  return zip;
}

export function renderPlanoDocx(item: PlanoExportCard, linkSistema: string): Buffer {
  const zip = loadTemplateZip();
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });
  doc.render(buildData(item, linkSistema));

  const outZip = doc.getZip();
  const rendered = outZip.file("word/document.xml");
  if (rendered) {
    outZip.file("word/document.xml", stripUnnecessaryBlankLastPage(rendered.asText()));
  }

  return outZip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}

/** Converte DOCX → DOC via Microsoft Word (Windows). */
async function convertDocxBufferToDoc(docxBuffer: Buffer): Promise<Buffer> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "plano-"));
  const inPath = path.join(tmp, "in.docx");
  const outPath = path.join(tmp, "out.doc");
  fs.writeFileSync(inPath, docxBuffer);

  const inEsc = inPath.replace(/\\/g, "\\\\");
  const outEsc = outPath.replace(/\\/g, "\\\\");

  const ps = `
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open('${inEsc}')
  # Remove apenas paragrafos vazios no FINAL (nao mexe no espacamento do meio)
  while ($doc.Paragraphs.Count -gt 1) {
    $p = $doc.Paragraphs.Item($doc.Paragraphs.Count)
    $t = ($p.Range.Text -replace \"\`r|\`n|\`t|\\u00a0|\\u0007\", '').Trim()
    if ($t -eq '') { $p.Range.Delete() | Out-Null } else { break }
  }
  $null = $doc.SaveAs([ref] '${outEsc}', [ref] 0)
  $doc.Close()
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
`;
  try {
    await execFileAsync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { windowsHide: true, timeout: 120000 },
    );
    if (!fs.existsSync(outPath)) {
      throw new Error("Word não gerou o arquivo .doc");
    }
    return fs.readFileSync(outPath);
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export async function renderPlanoDoc(item: PlanoExportCard, linkSistema: string): Promise<Buffer> {
  const docx = renderPlanoDocx(item, linkSistema);
  try {
    return await convertDocxBufferToDoc(docx);
  } catch (e) {
    // Fallback: se Word não estiver disponível, devolve docx (melhor que falhar)
    console.error("Falha ao converter para .doc, usando .docx:", e);
    return docx;
  }
}

export async function buildPlanoExport(
  items: PlanoExportCard[],
  linkSistema: string,
): Promise<{ filename: string; contentType: string; buffer: Buffer }> {
  const rendered: { name: string; buffer: Buffer; isDoc: boolean }[] = [];

  for (const item of items) {
    const docx = renderPlanoDocx(item, linkSistema);
    let buffer = docx;
    let isDoc = false;
    try {
      buffer = await convertDocxBufferToDoc(docx);
      isDoc = true;
    } catch (e) {
      console.error("Conversão .doc falhou:", e);
    }
    const ext = isDoc ? "doc" : "docx";
    rendered.push({
      name: `plano-acao-${slugify(item.card.titulo)}.${ext}`,
      buffer,
      isDoc,
    });
  }

  if (rendered.length === 1) {
    const file = rendered[0];
    return {
      filename: file.name,
      contentType: file.isDoc
        ? "application/msword"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: file.buffer,
    };
  }

  const zip = new JSZip();
  const used = new Set<string>();
  for (const file of rendered) {
    let base = file.name;
    let n = 1;
    while (used.has(base)) {
      const ext = path.extname(file.name);
      const stem = path.basename(file.name, ext);
      base = `${stem}-${n}${ext}`;
      n += 1;
    }
    used.add(base);
    zip.file(base, file.buffer);
  }
  const buffer = Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
  return {
    filename: `planos-acao-${new Date().toISOString().slice(0, 10)}.zip`,
    contentType: "application/zip",
    buffer,
  };
}
