import { api } from "./api";

export function mesDeslocado(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export const MES_CURTO = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });
export const rotuloMes = (mes: string) =>
  MES_CURTO.format(new Date(`${mes}-01T12:00:00Z`)).replace(".", "");

export type TotaisMes = {
  perda: number; // descartes em R$
  usado: number; // todo uso (inclui uso normal) em R$
  salvo: number; // prato do dia + promoção + doação
  doado: number;
  motivos: { vencido: number; estragado: number; sobra: number };
  destinos: { prato_do_dia: number; promocao: number; doacao: number };
};

type Janela = { usado: number; perda: number };
type ResumoApi = {
  meses: (TotaisMes & { mes: string })[];
  ultimos30: Janela;
  anteriores30: Janela;
};

/** Aproveitamento = usado ÷ (usado + perdido). null quando não há movimentação. */
export function aproveitamento(t: { usado: number; perda: number }): number | null {
  const total = t.usado + t.perda;
  return total > 0 ? t.usado / total : null;
}

/**
 * Resumo calculado pela API Haskell (GET /resumo): totais dos últimos 6 meses
 * (do mais antigo ao atual) e uso/perda nos últimos 30 dias e nos 30 anteriores.
 */
export async function resumoMensal() {
  const r = await api<ResumoApi>("GET", "/resumo");
  const meses = r.meses.map((m) => m.mes);
  const porMes = new Map<string, TotaisMes>(r.meses.map((m) => [m.mes, m]));
  const taxa = (j: Janela) => ({ ...j, taxa: aproveitamento(j) });
  return { meses, porMes, ult30: taxa(r.ultimos30), ant30: taxa(r.anteriores30) };
}

/** "Bom dia" / "Boa tarde" / "Boa noite" no fuso de São Paulo. */
export function saudacao(): string {
  const h =
    Number(
      new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }),
    ) % 24;
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
