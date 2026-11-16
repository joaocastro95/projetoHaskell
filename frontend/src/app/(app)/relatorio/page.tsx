import Link from "next/link";
import { DESTINOS, MOTIVOS, brl, hojeISO, qtd } from "@/lib/format";
import { api, requireUser } from "@/lib/api";
import { resumoMensal } from "@/lib/resumo";

type Mov = {
  id: string;
  tipo: "uso" | "descarte";
  motivo: keyof typeof MOTIVOS | null;
  destino: keyof typeof DESTINOS | null;
  quantidade: number;
  valor: number;
  created_at: string;
  lotes: { produto: string; unidade: string } | null;
};

type RelatorioApi = {
  perdido: number;
  movimentacoes: {
    id: number;
    produto: string;
    unidade: string;
    tipo: "uso" | "descarte";
    motivo: keyof typeof MOTIVOS | null;
    destino: keyof typeof DESTINOS | null;
    quantidade: number;
    valor: number;
    data: string;
  }[];
};

function mesAnterior(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

const NOME_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const MES_CURTO = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" });

/** R$ compacto para caber no gráfico: R$ 950, R$ 1,2 mil. */
function brlCurto(v: number): string {
  return v >= 1000
    ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : `R$ ${Math.round(v)}`;
}

export default async function Relatorio({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mesAtual = hojeISO().slice(0, 7);
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesAtual;
  const proximo = mesAnterior(mes, 1);

  // Gráfico: últimos 6 meses (calculados pela API Haskell em GET /resumo)
  await requireUser();
  const [resumo, rel] = await Promise.all([
    resumoMensal(),
    api<RelatorioApi>("GET", `/relatorio?mes=${mes}`),
  ]);
  const mesesJanela = resumo.meses;
  const porMes = new Map(
    mesesJanela.map((m) => [m, { perda: resumo.porMes.get(m)!.perda, salvo: resumo.porMes.get(m)!.salvo }]),
  );
  const maiorMes = Math.max(1, ...[...porMes.values()].flatMap((v) => [v.perda, v.salvo]));

  // Movimentações do mês escolhido, no formato que a tela já usava
  const movsMes: Mov[] = rel.movimentacoes.map((m) => ({
    id: String(m.id),
    tipo: m.tipo,
    motivo: m.motivo,
    destino: m.destino,
    quantidade: m.quantidade,
    valor: m.valor,
    created_at: `${m.data}T12:00:00-03:00`,
    lotes: { produto: m.produto, unidade: m.unidade },
  }));

  // Mês anterior pode estar fora da janela de 6 meses; aí pergunta à API.
  const mesAntes = mesAnterior(mes, -1);
  const perdidoMesAnterior =
    porMes.get(mesAntes)?.perda ?? (await api<RelatorioApi>("GET", `/relatorio?mes=${mesAntes}`)).perdido;
  const mesFechado = mes < mesAtual;

  const movs = movsMes;
  const descartes = movs.filter((m) => m.tipo === "descarte");
  const salvos = movs.filter(
    (m) => m.tipo === "uso" && m.destino && m.destino !== "uso_normal",
  );

  const totalPerdido = descartes.reduce((s, m) => s + Number(m.valor), 0);
  const totalSalvo = salvos.reduce((s, m) => s + Number(m.valor), 0);
  const doado = salvos
    .filter((m) => m.destino === "doacao")
    .reduce((s, m) => s + Number(m.valor), 0);

  const porMotivo = Object.keys(MOTIVOS).map((k) => ({
    motivo: k as keyof typeof MOTIVOS,
    valor: descartes.filter((m) => m.motivo === k).reduce((s, m) => s + Number(m.valor), 0),
  }));

  type Acumulado = { valor: number; vezes: number; porMotivo: Record<string, number> };
  const porProduto = new Map<string, Acumulado>();
  for (const m of descartes) {
    const nome = m.lotes?.produto ?? "—";
    const atual = porProduto.get(nome) ?? { valor: 0, vezes: 0, porMotivo: {} };
    atual.valor += Number(m.valor);
    atual.vezes += 1;
    atual.porMotivo[m.motivo!] = (atual.porMotivo[m.motivo!] ?? 0) + Number(m.valor);
    porProduto.set(nome, atual);
  }
  const ranking = [...porProduto.entries()].sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);
  const maiorValor = ranking[0]?.[1].valor || 1;

  // A dica depende do motivo que mais pesou no insumo campeão de perda.
  let dica: React.ReactNode = null;
  if (ranking.length > 0) {
    const [nome, r] = ranking[0];
    const motivo = Object.entries(r.porMotivo).sort((a, b) => b[1] - a[1])[0][0];
    const p = <strong>{nome}</strong>;
    dica =
      motivo === "vencido" ? (
        <>Dica: {p} está vencendo no estoque. Reduza a próxima compra ou compre com mais frequência e em menor quantidade.</>
      ) : motivo === "estragado" ? (
        <>Dica: {p} está estragando antes da validade. Revise armazenamento: temperatura, embalagem e manuseio.</>
      ) : (
        <>Dica: {p} está sobrando na produção. Prepare menos ou aproveite a sobra no prato do dia seguinte.</>
      );
  }

  const nomeMes = NOME_MES.format(new Date(`${mes}-01T12:00:00Z`));
  const tituloMes = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/relatorio?mes=${mesAnterior(mes, -1)}`} className="btn-secundario px-3 py-1.5">
          ←
        </Link>
        <h1 className="text-center font-display text-xl font-extrabold">
          Perdas · {tituloMes}
        </h1>
        {mes < mesAtual ? (
          <Link href={`/relatorio?mes=${proximo}`} className="btn-secundario px-3 py-1.5">
            →
          </Link>
        ) : (
          <span className="w-10" />
        )}
      </div>

      {/* Últimos 6 meses: toque numa coluna para abrir o mês */}
      <section className="cartao">
        <div className="mb-3 flex items-center justify-between text-xs text-stone-600">
          <span className="font-semibold text-stone-800">Últimos 6 meses</span>
          <span className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Perda
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Salvo
            </span>
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {mesesJanela.map((m) => {
            const v = porMes.get(m)!;
            const ativo = m === mes;
            const futuro = m > mesAtual;
            const rotulo = MES_CURTO.format(new Date(`${m}-01T12:00:00Z`)).replace(".", "");
            const conteudo = (
              <>
                <span className="text-[10px] font-semibold text-red-700 sm:text-xs">
                  {v.perda > 0 ? brlCurto(v.perda) : "–"}
                </span>
                <span className="flex h-28 w-full items-end justify-center gap-1">
                  <span
                    className="w-3 rounded-t bg-red-500 sm:w-4"
                    style={{ height: `${(v.perda / maiorMes) * 100}%` }}
                  />
                  <span
                    className="w-3 rounded-t bg-emerald-500 sm:w-4"
                    style={{ height: `${(v.salvo / maiorMes) * 100}%` }}
                  />
                </span>
                <span className={`text-xs capitalize ${ativo ? "font-bold text-stone-900" : "text-stone-600"}`}>
                  {rotulo}
                </span>
              </>
            );
            return futuro ? (
              <div key={m} className="flex flex-col items-center gap-1 rounded-lg p-1 opacity-30">
                {conteudo}
              </div>
            ) : (
              <Link
                key={m}
                href={`/relatorio?mes=${m}`}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 rounded-lg p-1 ${ativo ? "bg-stone-100 ring-2 ring-emerald-600" : "hover:bg-stone-50"}`}
              >
                {conteudo}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="cartao">
          <p className="text-sm text-stone-600">Prejuízo com descarte</p>
          <p className="font-display text-2xl font-extrabold text-red-700">{brl(totalPerdido)}</p>
          {perdidoMesAnterior > 0 &&
            (mesFechado ? (
              <Variacao atual={totalPerdido} anterior={perdidoMesAnterior} />
            ) : (
              <p className="text-xs text-stone-500">
                mês em andamento · mês anterior: {brl(perdidoMesAnterior)}
              </p>
            ))}
        </div>
        <div className="cartao">
          <p className="text-sm text-stone-600">Salvo antes de vencer</p>
          <p className="font-display text-2xl font-extrabold text-emerald-700">{brl(totalSalvo)}</p>
          <p className="text-xs text-stone-500">prato do dia, promoção e doação</p>
        </div>
        <div className="cartao">
          <p className="text-sm text-stone-600">Doado</p>
          <p className="font-display text-2xl font-extrabold">{brl(doado)}</p>
        </div>
      </section>

      <section className="cartao">
        <h2 className="font-semibold">Por motivo</h2>
        <ul className="mt-3 grid grid-cols-3 gap-3 text-center">
          {porMotivo.map((p) => (
            <li key={p.motivo}>
              <p className="text-sm text-stone-600">{MOTIVOS[p.motivo]}</p>
              <p className="font-bold">{brl(p.valor)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao">
        <h2 className="font-semibold">Insumos que mais geram perda</h2>
        {ranking.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">Nenhum descarte neste mês.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {ranking.map(([nome, r]) => (
              <li key={nome}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{nome}</span>
                  <span>
                    {brl(r.valor)} · {r.vezes}x
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-stone-100">
                  <div
                    className="h-2 rounded-full bg-red-500"
                    style={{ width: `${(r.valor / maiorValor) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {ranking.length > 0 && (
          <p className="mt-4 text-sm text-stone-600">
            {dica}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Movimentações do mês</h2>
        {movs.length === 0 ? (
          <p className="cartao text-center text-sm text-stone-600">Nada registrado.</p>
        ) : (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {movs.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.lotes?.produto}</p>
                  <p className="text-stone-500">
                    {new Date(m.created_at).toLocaleDateString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}{" "}
                    · {qtd(Number(m.quantidade), m.lotes?.unidade ?? "")} ·{" "}
                    {m.tipo === "descarte"
                      ? `Descarte (${MOTIVOS[m.motivo!]})`
                      : DESTINOS[m.destino!]}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-semibold ${m.tipo === "descarte" ? "text-red-700" : "text-stone-700"}`}
                >
                  {m.tipo === "descarte" ? "−" : ""}
                  {brl(Number(m.valor))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const caiu = pct <= 0;
  return (
    <p className={`text-xs font-semibold ${caiu ? "text-emerald-700" : "text-red-700"}`}>
      {caiu ? "▼" : "▲"} {Math.abs(pct)}% vs. mês anterior ({brl(anterior)})
    </p>
  );
}
