const TZ = "America/Sao_Paulo";

/**
 * Lê números digitados no padrão brasileiro: "1.234,56", "R$ 89,90", "1,5", "2.5".
 * Com vírgula, o ponto é separador de milhar; sem vírgula, o ponto é decimal.
 */
export function lerNumero(v: unknown): number {
  let s = String(v ?? "").replace(/R\$|\s/g, "");
  if (s === "") return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return Number(s);
}

/** Data de hoje (fuso de São Paulo) no formato YYYY-MM-DD. */
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Dias entre hoje e a data (YYYY-MM-DD). Negativo = vencido. */
export function diasAte(dataISO: string, hoje = hojeISO()): number {
  const a = Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10));
  const b = Date.UTC(+dataISO.slice(0, 4), +dataISO.slice(5, 7) - 1, +dataISO.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function somarDias(dataISO: string, dias: number): string {
  const d = new Date(`${dataISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function brl(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Unidades que só existem inteiras (não há meia caixa nem meio pacote). */
const UNIDADES_INTEIRAS = new Set(["un", "cx", "pct", "dz", "g", "mL"]);

export function ehInteira(unidade: string): boolean {
  return UNIDADES_INTEIRAS.has(unidade);
}

/** Quantidade para exibir: inteira para un/cx/pct/dz/g/mL, até 2 casas para kg e L. */
export function qtd(valor: number, unidade: string): string {
  const casas = ehInteira(unidade) ? 0 : 2;
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: casas })} ${unidade}`;
}

export function dataBR(dataISO: string): string {
  const [y, m, d] = dataISO.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export type NivelAlerta = "vencido" | "hoje" | "3dias" | "7dias" | "ok";

/** Faixas de alerta do fluxograma: 7, 3 e 0 dias. */
export function nivelAlerta(dias: number): NivelAlerta {
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoje";
  if (dias <= 3) return "3dias";
  if (dias <= 7) return "7dias";
  return "ok";
}

export const ROTULO_ALERTA: Record<NivelAlerta, string> = {
  vencido: "Vencido",
  hoje: "Vence hoje",
  "3dias": "Até 3 dias",
  "7dias": "Até 7 dias",
  ok: "No prazo",
};

export const COR_ALERTA: Record<NivelAlerta, string> = {
  vencido: "bg-red-600 text-white",
  hoje: "bg-red-100 text-red-800",
  "3dias": "bg-amber-100 text-amber-800",
  "7dias": "bg-yellow-50 text-yellow-800",
  ok: "bg-emerald-50 text-emerald-800",
};

export function textoDias(dias: number): string {
  if (dias < 0) return `venceu há ${-dias} dia${dias === -1 ? "" : "s"}`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}

export const MOTIVOS = {
  vencido: "Vencido",
  estragado: "Estragado",
  sobra: "Sobra",
} as const;

export const DESTINOS = {
  uso_normal: "Uso normal",
  prato_do_dia: "Prato do dia",
  promocao: "Promoção",
  doacao: "Doação (Lei 14.016/2020)",
} as const;

export type Lote = {
  id: string;
  produto: string;
  lote: string | null;
  unidade: string;
  quantidade_inicial: number;
  quantidade: number;
  custo_unitario: number;
  validade: string;
  recebido_em: string;
};
