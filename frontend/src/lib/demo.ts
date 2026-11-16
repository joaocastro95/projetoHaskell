/**
 * Gera dados de demonstração: um restaurante pequeno com 3 meses de histórico
 * (perdas caindo mês a mês, valor salvo subindo) e estoque atual com alertas.
 * Função pura e determinística, para poder ser testada sem banco.
 */
import { somarDias } from "./format";

type Produto = {
  produto: string;
  unidade: string;
  custo: number; // R$ por unidade
  qtd: number; // tamanho típico do lote
  vida: number; // dias de validade a partir do recebimento
  motivos: ("vencido" | "estragado" | "sobra")[]; // motivos de perda mais comuns
};

const PRODUTOS: Produto[] = [
  { produto: "Peito de frango", unidade: "kg", custo: 18, qtd: 10, vida: 4, motivos: ["vencido", "estragado"] },
  { produto: "Carne moída", unidade: "kg", custo: 32, qtd: 6, vida: 3, motivos: ["vencido", "estragado"] },
  { produto: "Filé de tilápia", unidade: "kg", custo: 38, qtd: 5, vida: 3, motivos: ["estragado", "vencido"] },
  { produto: "Leite integral", unidade: "L", custo: 5, qtd: 12, vida: 5, motivos: ["vencido"] },
  { produto: "Queijo muçarela", unidade: "kg", custo: 40, qtd: 4, vida: 15, motivos: ["vencido", "estragado"] },
  { produto: "Presunto", unidade: "kg", custo: 35, qtd: 3, vida: 10, motivos: ["vencido"] },
  { produto: "Alface", unidade: "un", custo: 2.5, qtd: 20, vida: 4, motivos: ["estragado"] },
  { produto: "Tomate", unidade: "kg", custo: 7, qtd: 10, vida: 7, motivos: ["estragado"] },
  { produto: "Banana", unidade: "kg", custo: 6, qtd: 8, vida: 5, motivos: ["estragado"] },
  { produto: "Iogurte natural", unidade: "un", custo: 3.2, qtd: 20, vida: 12, motivos: ["vencido"] },
  { produto: "Pão de hambúrguer", unidade: "pct", custo: 12, qtd: 10, vida: 6, motivos: ["vencido", "estragado"] },
  { produto: "Arroz cozido", unidade: "kg", custo: 4, qtd: 8, vida: 2, motivos: ["sobra"] },
  { produto: "Feijão cozido", unidade: "kg", custo: 5, qtd: 6, vida: 2, motivos: ["sobra"] },
  { produto: "Ovos", unidade: "dz", custo: 14, qtd: 10, vida: 21, motivos: ["vencido"] },
];

export type LoteDemo = {
  id: string;
  produto: string;
  lote: string;
  unidade: string;
  quantidade_inicial: number;
  quantidade: number;
  custo_unitario: number;
  validade: string;
  recebido_em: string;
};

export type MovDemo = {
  lote_id: string;
  tipo: "uso" | "descarte";
  motivo: "vencido" | "estragado" | "sobra" | null;
  destino: "uso_normal" | "prato_do_dia" | "promocao" | "doacao" | null;
  quantidade: number;
  valor: number;
  created_at: string;
};

/** PRNG simples (mulberry32) para os dados saírem sempre iguais. */
function gerador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;
/** Quantidade realista: inteira para un/pct/dz; múltiplos de 0,5 (lote) ou 0,1 (baixa) para kg e L. */
const arred = (n: number, unidade: string, passo = 0.1) =>
  ["un", "cx", "pct", "dz", "g", "mL"].includes(unidade) ? Math.round(n) : r3(Math.round(n / passo) * passo);
const r2 = (n: number) => Math.round(n * 100) / 100;
const horario = (dia: string) => `${dia}T15:00:00-03:00`;

export function gerarDadosDemo(hoje: string, novoId: () => string) {
  const rnd = gerador(20261215);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

  const lotes: LoteDemo[] = [];
  const movs: MovDemo[] = [];
  let numLote = 1000;

  // ---- Histórico: 3 meses fechados + mês atual, lotes já baixados ----
  // Mês mais antigo = "antes" do PerdaZero; a perda cai e o valor salvo sobe.
  const mesAtual = hoje.slice(0, 7);
  const inicio = mesDeslocado(mesAtual, -3) + "-01";
  const FATOR_PERDA = [1, 0.75, 0.5, 0.35]; // por mês: M-3, M-2, M-1, atual
  const FATOR_SALVO = [0.2, 0.6, 0.9, 1.1];

  let entrega = 0;
  for (let recebido = inicio; recebido <= somarDias(hoje, -3); recebido = somarDias(recebido, 2), entrega++) {
    const idx = 3 - mesesEntre(recebido.slice(0, 7), mesAtual);
    const fatorPerda = FATOR_PERDA[idx];
    const fatorSalvo = FATOR_SALVO[idx];

    // Rodízio fixo de produtos, para cada mês ter um mix parecido
    const escolhidos = [0, 1, 2, 3, 4].map((j) => PRODUTOS[(entrega * 5 + j) % PRODUTOS.length]);

    for (const p of escolhidos) {
      const id = novoId();
      const qtd = Math.max(arred(p.qtd * (0.8 + rnd() * 0.4), p.unidade, 0.5), 1);
      const validade = somarDias(recebido, p.vida);
      if (validade >= hoje) continue; // histórico só com lotes já encerrados

      const perda = rnd() < 0.65 ? arred(qtd * (0.15 + rnd() * 0.2) * fatorPerda, p.unidade) : 0;
      const salvo = rnd() < 0.7 ? arred((qtd - perda) * (0.1 + rnd() * 0.15) * fatorSalvo, p.unidade) : 0;
      const normal = r3(qtd - perda - salvo);

      lotes.push({
        id,
        produto: p.produto,
        lote: `L${numLote++}`,
        unidade: p.unidade,
        quantidade_inicial: qtd,
        quantidade: 0,
        custo_unitario: p.custo,
        validade,
        recebido_em: recebido,
      });

      const meio = somarDias(recebido, Math.max(1, Math.floor(p.vida / 2)));
      if (normal > 0) {
        movs.push(mov(id, "uso", null, "uso_normal", normal, p.custo, meio));
      }
      if (salvo > 0) {
        // Doação só com folga de validade; senão prato do dia ou promoção.
        const destino = p.vida >= 4 && rnd() < 0.3 ? "doacao" : pick(["prato_do_dia", "promocao"] as const);
        const dia = destino === "doacao" ? somarDias(validade, -2) : somarDias(validade, -1);
        movs.push(mov(id, "uso", null, destino, salvo, p.custo, dia < recebido ? recebido : dia));
      }
      if (perda > 0) {
        const motivo = pick(p.motivos);
        const dia =
          motivo === "vencido" ? somarDias(validade, 1) : motivo === "sobra" ? somarDias(recebido, 1) : meio;
        movs.push(mov(id, "descarte", motivo, null, perda, p.custo, dia));
      }
    }
  }

  // ---- Estoque atual: garante exemplos em todas as faixas de alerta ----
  const atuais: [string, number][] = [
    ["Leite integral", -1], // vencido
    ["Peito de frango", 0], // vence hoje
    ["Alface", 1],
    ["Filé de tilápia", 2],
    ["Tomate", 3],
    ["Pão de hambúrguer", 5],
    ["Iogurte natural", 6],
    ["Queijo muçarela", 10],
    ["Presunto", 12],
    ["Ovos", 18],
    ["Carne moída", 2],
    ["Banana", 4],
  ];
  for (const [nome, diasParaVencer] of atuais) {
    const p = PRODUTOS.find((x) => x.produto === nome)!;
    const validade = somarDias(hoje, diasParaVencer);
    const recebido = somarDias(validade, -p.vida);
    const qtd = Math.max(arred(p.qtd * (0.7 + rnd() * 0.5), p.unidade, 0.5), 1);
    const id = novoId();
    // Parte já usada antes de hoje
    const usado = recebido < hoje ? arred(qtd * (0.2 + rnd() * 0.4), p.unidade) : 0;

    lotes.push({
      id,
      produto: p.produto,
      lote: `L${numLote++}`,
      unidade: p.unidade,
      quantidade_inicial: qtd,
      quantidade: r3(qtd - usado),
      custo_unitario: p.custo,
      validade,
      recebido_em: recebido > hoje ? hoje : recebido,
    });
    if (usado > 0) {
      const dia = somarDias(recebido, 1);
      movs.push(mov(id, "uso", null, "uso_normal", usado, p.custo, dia > hoje ? hoje : dia));
    }
  }

  // Nada no futuro
  for (const m of movs) if (m.created_at > horario(hoje)) m.created_at = horario(hoje);

  return { lotes, movs };
}

function mesDeslocado(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function mesesEntre(de: string, ate: string): number {
  const [y1, m1] = de.split("-").map(Number);
  const [y2, m2] = ate.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

function mov(
  lote_id: string,
  tipo: MovDemo["tipo"],
  motivo: MovDemo["motivo"],
  destino: MovDemo["destino"],
  quantidade: number,
  custo: number,
  dia: string,
): MovDemo {
  return { lote_id, tipo, motivo, destino, quantidade, valor: r2(quantidade * custo), created_at: horario(dia) };
}
