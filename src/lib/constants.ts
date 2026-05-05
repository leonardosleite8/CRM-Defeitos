export const MODELOS_PRODUTO = [
  "BA37",
  "BA37T",
  "BA37C",
  "B35",
  "B40",
  "POP S",
  "POP Z Eco",
  "POP Z",
  "POP Z New",
  "POP Z New Connect",
  "POP Z Mira",
  "POP Z MiraPro",
  "Integra",
  "Urano Connect",
  "UDC CO/E",
  "UC 5",
  "Fatiador de frios SM 300",
  "Fatiador de frios Robusto U SM1 320",
  "UDC POP",
  "UDC 10000/1",
  "UDC 20000/2",
  "UDC 50000/20",
  "UDC 6000/1 ST",
  "UA 5100K",
  "UA 3100K",
  "UA 2200K",
  "UA 220",
  "UA 420",
  "UA 5200",
  "USE-CB III",
  "UR 10.000 Light",
  "Rodoviária",
  "INDICADOR WT27 R",
  "UBB 15/5",
  "CP 30/2 POP+",
  "UD 1500/0,1 LE",
  "Self checkout",
] as const;

export const LINHAS = [
  "Urano Lab",
  "Industrial",
  "Comercial",
  "Automação",
  "Gastronomia",
  "Rodoviária",
  "Farmácia",
] as const;

export const DEFECT_ORIGEM = ["Produção", "Comercial", "ATU", "P&D", "Marketing", "Outros"] as const;

export const DEFECT_STATUS = ["Aguardando", "Em execução", "Concluído"] as const;

export const DEFECT_SEVERIDADE = ["Baixa", "Média", "Alta", "Crítica"] as const;

export type DefectOrigem = (typeof DEFECT_ORIGEM)[number];
export type DefectStatus = (typeof DEFECT_STATUS)[number];
export type DefectSeveridade = (typeof DEFECT_SEVERIDADE)[number];
