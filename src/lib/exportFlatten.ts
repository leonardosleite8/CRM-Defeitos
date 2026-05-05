/**
 * Converte valores vindos do DB (arrays aninhados, strings JSON, etc.)
 * em texto plano para relatórios CSV/Excel.
 */
export function flattenForExport(value: unknown, separator = ", "): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") return "";
    if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
      try {
        const parsed = JSON.parse(t) as unknown;
        return flattenForExport(parsed, separator);
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    const flat = value.flat(Infinity) as unknown[];
    const parts = flat.map((item) => {
      if (item === null || item === undefined) return "";
      if (typeof item === "string") {
        const s = item.trim();
        if (!s) return "";
        if ((s.startsWith("[") && s.endsWith("]")) || /^".*"$/.test(s)) {
          try {
            const inner = JSON.parse(s) as unknown;
            return flattenForExport(inner, separator);
          } catch {
            return item;
          }
        }
        return item;
      }
      return flattenForExport(item, separator);
    });
    return parts.filter((p) => p !== "").join(separator);
  }

  return String(value);
}

export function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
