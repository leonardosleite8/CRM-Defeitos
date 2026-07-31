/** Labels amigáveis para ações de auditoria. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: "Login",
  login_failed: "Login falhou",
  logout: "Logout",
  user_create: "Usuário criado",
  user_activate: "Usuário ativado",
  user_deactivate: "Usuário desativado",
  password_change: "Senha alterada",
  name_change: "Nome alterado",
  export_plano_acao: "Exportou plano de ação",
  card_create: "Card criado",
  card_update: "Card editado",
  card_move: "Card movido",
  card_delete: "Card excluído",
  comment_create: "Comentário criado",
  comment_update: "Comentário editado",
};

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function formatValueForAudit(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ") || "—";
  return String(v);
}

const FIELD_LABELS: Record<string, string> = {
  titulo: "Título",
  descricao: "Descrição",
  solucao: "Solução",
  origem: "Origem",
  setor_responsavel: "Setor responsável",
  severidade: "Severidade",
  modelo_produto: "Modelo",
  linha: "Linha",
  media_urls: "Anexos",
  responsavel: "Responsável",
  status: "Status",
  previsao_conclusao: "Previsão",
  column_id: "Coluna",
  ordem: "Ordem",
};

export function buildFieldDiffDetail(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): string {
  const parts: string[] = [];
  for (const [key, next] of Object.entries(patch)) {
    if (!(key in before) && next === undefined) continue;
    const prev = before[key];
    const a = formatValueForAudit(prev);
    const b = formatValueForAudit(next);
    if (a === b) continue;
    const label = FIELD_LABELS[key] ?? key;
    parts.push(`${label}: "${a}" → "${b}"`);
  }
  return parts.join("; ");
}
