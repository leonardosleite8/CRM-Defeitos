/** Formato público do código do card: CD + 4 dígitos (ex.: CD0001). Máx. 6 caracteres. */
export function formatCardCodigo(codigo: number | null | undefined): string {
  const n = Number(codigo);
  if (!Number.isFinite(n) || n <= 0) return "";
  const seq = Math.min(Math.floor(n), 9999);
  return `CD${String(seq).padStart(4, "0")}`;
}
