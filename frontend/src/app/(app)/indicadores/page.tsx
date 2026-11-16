import Link from "next/link";
import { Icone } from "@/components/Icone";
import { Folha } from "@/components/Legumes";
import { brl, hojeISO, somarDias } from "@/lib/format";
import { resumoMensal, rotuloMes, type TotaisMes } from "@/lib/resumo";
import { listarLotes, requireUser } from "@/lib/api";

const META = 0.3; // meta da apresentação: -30% de perdas

const COR_MOTIVO = { vencido: "#dc2626", estragado: "#f59e0b", sobra: "#6366f1" } as const;
const NOME_MOTIVO = { vencido: "Vencido", estragado: "Estragado", sobra: "Sobra" } as const;
const DIAG_MOTIVO = {
  vencido: "comprando mais do que usa ou sem girar o estoque",
  estragado: "armazenamento: temperatura, embalagem ou manuseio",
  sobra: "produção acima da venda",
} as const;
const COR_DESTINO = { prato_do_dia: "#0d6b45", promocao: "#a6d94a", doacao: "#f08a24" } as const;
const NOME_DESTINO = { prato_do_dia: "Prato do dia", promocao: "Promoção", doacao: "Doação" } as const;

const DIA_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const brlCurto = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`;

export default async function Indicadores() {
  await requireUser();
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);

  // Tudo calculado pela API Haskell: 6 meses + aproveitamento em 30 dias vs. os 30 anteriores
  const [{ meses, porMes, ult30, ant30 }, lotes] = await Promise.all([resumoMensal(), listarLotes()]);
  const proximos = lotes.filter((l) => l.validade >= hoje && l.validade <= somarDias(hoje, 13));

  const aprovAtual = ult30.taxa;
  const aprovAnterior = ant30.taxa;

  // Meta: perda do último mês fechado vs. o primeiro mês com movimentação na janela
  const fechados = meses.slice(0, 5).filter((m) => {
    const t = porMes.get(m)!;
    return t.usado + t.perda > 0;
  });
  const mesBase = fechados[0];
  const mesComparado = fechados[fechados.length - 1];
  const base = mesBase ? porMes.get(mesBase)!.perda : 0;
  const comparado = mesComparado ? porMes.get(mesComparado)!.perda : 0;
  const reducao = mesBase && mesComparado && mesBase !== mesComparado && base > 0 ? 1 - comparado / base : null;

  // Motivos: últimos 3 meses somados (mais estável que um mês só)
  const ultimos3 = meses.slice(3);
  const motivos = { vencido: 0, estragado: 0, sobra: 0 };
  for (const m of ultimos3) {
    const t = porMes.get(m)!;
    for (const k of Object.keys(motivos) as (keyof typeof motivos)[]) motivos[k] += t.motivos[k];
  }
  const totalMotivos = motivos.vencido + motivos.estragado + motivos.sobra;
  const motivoPrincipal = (Object.keys(motivos) as (keyof typeof motivos)[]).sort((a, b) => motivos[b] - motivos[a])[0];

  // Vencimentos dos próximos 14 dias
  const dias = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i));
  const porDia = new Map(dias.map((d) => [d, 0]));
  for (const l of proximos ?? []) {
    porDia.set(l.validade, (porDia.get(l.validade) ?? 0) + Number(l.quantidade) * Number(l.custo_unitario));
  }
  const maiorDia = Math.max(1, ...porDia.values());
  const totalProximos = [...porDia.values()].reduce((s, v) => s + v, 0);
  const diaPico = [...porDia.entries()].sort((a, b) => b[1] - a[1])[0];

  // Destinos do valor salvo por mês
  const maiorSalvo = Math.max(1, ...meses.map((m) => porMes.get(m)!.salvo));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo-pagina sm:text-3xl">Indicadores</h1>
          <p className="text-sm text-stone-500">Como a sua cozinha está indo</p>
        </div>
        <Link href="/relatorio" className="btn-secundario py-2 text-sm">
          Relatório detalhado do mês <Icone nome="diagonal" className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* 1. Aproveitamento */}
        <Cartao titulo="Aproveitamento" sub="últimos 30 dias" icone="check">
          {aprovAtual === null ? (
            <Vazio texto="Registre usos e descartes para ver o aproveitamento." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Anel valor={aprovAtual} />
                <div className="min-w-0 space-y-3 text-sm">
                  <ValorLegenda cor="#0d6b45" rotulo="Usado" valor={brl(ult30.usado)} />
                  <ValorLegenda cor="#dc2626" rotulo="Perdido" valor={brl(ult30.perda)} />
                </div>
              </div>
              {aprovAnterior !== null && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <span
                    className={`rounded-full px-2 py-0.5 font-bold ${
                      aprovAtual >= aprovAnterior ? "bg-limao text-noite" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {aprovAtual >= aprovAnterior ? "▲" : "▼"} {Math.abs(Math.round((aprovAtual - aprovAnterior) * 100))} p.p.
                  </span>
                  30 dias anteriores: {pct(aprovAnterior)}
                </p>
              )}
            </div>
          )}
        </Cartao>

        {/* 2. Meta de redução */}
        <Cartao titulo="Meta: reduzir perdas em 30%" sub="último mês fechado vs. primeiro mês de uso" icone="queda" className="md:col-span-2">
          {reducao === null ? (
            <Vazio texto="Precisa de pelo menos dois meses completos de uso para medir a meta." />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="font-display text-4xl font-extrabold tracking-tight text-stone-900">
                  {reducao >= 0 ? "−" : "+"}
                  {pct(Math.abs(reducao))}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    reducao >= META ? "bg-limao text-noite" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {reducao >= META ? "Meta batida" : `Faltam ${pct(META - Math.max(0, reducao))}`}
                </span>
              </div>
              <div className="relative h-4 rounded-full bg-stone-100">
                <div
                  className="h-4 rounded-full bg-mata"
                  style={{ width: `${Math.min(100, (Math.max(0, reducao) / 0.5) * 100)}%` }}
                />
                <div className="absolute inset-y-[-6px] w-0.5 bg-noite" style={{ left: `${(META / 0.5) * 100}%` }} />
                <span className="absolute -bottom-6 -translate-x-1/2 text-xs font-semibold text-noite" style={{ left: `${(META / 0.5) * 100}%` }}>
                  meta 30%
                </span>
              </div>
              <p className="pt-3 text-sm text-stone-600">
                <span className="capitalize">{rotuloMes(mesBase!)}</span>: {brl(base)} →{" "}
                <span className="capitalize">{rotuloMes(mesComparado!)}</span>: <strong>{brl(comparado)}</strong> em perdas
              </p>
            </div>
          )}
        </Cartao>

        {/* 3. Perdas por motivo */}
        <Cartao titulo="Perdas por motivo" sub="últimos 3 meses" icone="alerta">
          {totalMotivos === 0 ? (
            <Vazio texto="Nenhum descarte nos últimos 3 meses." />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-5">
                <Rosca
                  partes={(Object.keys(motivos) as (keyof typeof motivos)[]).map((k) => ({
                    valor: motivos[k] / totalMotivos,
                    cor: COR_MOTIVO[k],
                  }))}
                  centro={brlCurto(totalMotivos)}
                />
                <div className="space-y-2 text-sm">
                  {(Object.keys(motivos) as (keyof typeof motivos)[]).map((k) => (
                    <Legenda key={k} cor={COR_MOTIVO[k]} rotulo={NOME_MOTIVO[k]} valor={pct(motivos[k] / totalMotivos)} />
                  ))}
                </div>
              </div>
              <p className="rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">
                <strong>{pct(motivos[motivoPrincipal] / totalMotivos)}</strong> é{" "}
                {NOME_MOTIVO[motivoPrincipal].toLowerCase()}: sinal de {DIAG_MOTIVO[motivoPrincipal]}.
              </p>
            </div>
          )}
        </Cartao>

        {/* 4. Vencimentos dos próximos 14 dias */}
        <Cartao titulo="O que vence nos próximos 14 dias" sub={`${brl(totalProximos)} em estoque`} icone="calendario" className="md:col-span-2">
          {totalProximos === 0 ? (
            <Vazio texto="Nada vence nas próximas duas semanas." />
          ) : (
            <>
              <div className="grid h-40 items-end gap-1 sm:gap-1.5" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
                {dias.map((d, i) => {
                  const v = porDia.get(d)!;
                  const pico = d === diaPico[0] && v > 0;
                  const urgente = i <= 3;
                  return (
                    <Link
                      key={d}
                      href="/insumos?f=7dias"
                      title={`${d.slice(8)}/${d.slice(5, 7)}: ${brl(v)}`}
                      className="flex h-full flex-col items-center justify-end gap-1"
                    >
                      {pico && <span className="text-[10px] font-bold text-noite">{brlCurto(v)}</span>}
                      <span
                        className={`w-full rounded-full ${v === 0 ? "bg-stone-100" : urgente ? "bg-amber-500" : "bg-mata/70"} ${pico ? "ring-2 ring-noite ring-offset-1" : ""}`}
                        style={{ height: `${Math.max(4, (v / maiorDia) * 100)}%` }}
                      />
                      <span className={`text-[10px] ${i === 0 ? "font-bold text-stone-900" : "text-stone-500"}`}>
                        {i === 0 ? "hoje" : DIA_SEMANA.format(new Date(`${d}T12:00:00Z`)).slice(0, 3)}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> próximos 3 dias</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mata/70" /> depois</span>
                {diaPico[1] > 0 && (
                  <span>
                    Pico em <strong className="text-stone-800">{diaPico[0].slice(8)}/{diaPico[0].slice(5, 7)}</strong>: planeje o prato do dia ou a doação antes.
                  </span>
                )}
              </p>
            </>
          )}
        </Cartao>

        {/* 5. Para onde foi o que foi salvo */}
        <Cartao titulo="Para onde foi o que foi salvo" sub="valor que deixou de ir para o lixo, por mês" icone="folha" className="md:col-span-3">
          {meses.every((m) => porMes.get(m)!.salvo === 0) ? (
            <Vazio texto="Use 'Prato do dia', 'Promoção' ou 'Doação' ao registrar um uso para aparecer aqui." />
          ) : (
            <div className="flex flex-col gap-5 md:flex-row md:items-end">
              <div className="grid h-44 flex-1 grid-cols-6 items-end gap-3 sm:gap-6">
                {meses.map((m) => {
                  const t: TotaisMes = porMes.get(m)!;
                  return (
                    <div key={m} className="flex h-full flex-col items-center justify-end gap-1.5">
                      <span className="text-[10px] font-semibold text-stone-600 sm:text-xs">{t.salvo > 0 ? brlCurto(t.salvo) : ""}</span>
                      <div
                        className="flex w-full max-w-14 flex-col-reverse overflow-hidden rounded-2xl"
                        style={{ height: `${Math.max(3, (t.salvo / maiorSalvo) * 100)}%` }}
                      >
                        {(Object.keys(COR_DESTINO) as (keyof typeof COR_DESTINO)[]).map((k) => (
                          <span
                            key={k}
                            style={{ height: t.salvo ? `${(t.destinos[k] / t.salvo) * 100}%` : "0%", background: COR_DESTINO[k] }}
                          />
                        ))}
                        {t.salvo === 0 && <span className="h-full bg-stone-100" />}
                      </div>
                      <span className={`text-xs capitalize ${m === mesAtual ? "font-bold text-stone-900" : "text-stone-500"}`}>{rotuloMes(m)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-sm md:flex-col md:gap-2">
                {(Object.keys(COR_DESTINO) as (keyof typeof COR_DESTINO)[]).map((k) => (
                  <Legenda key={k} cor={COR_DESTINO[k]} rotulo={NOME_DESTINO[k]} />
                ))}
                <Folha className="hidden h-16 w-16 md:block" />
              </div>
            </div>
          )}
        </Cartao>
      </div>
    </div>
  );
}

function Cartao({
  titulo,
  sub,
  icone,
  className = "",
  children,
}: {
  titulo: string;
  sub: string;
  icone: Parameters<typeof Icone>[0]["nome"];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`cartao ${className}`}>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
          <Icone nome={icone} className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-stone-900">{titulo}</p>
          <p className="text-xs text-stone-500">{sub}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">{texto}</p>;
}

function Legenda({ cor, rotulo, valor }: { cor: string; rotulo: string; valor?: string }) {
  return (
    <p className="flex items-center gap-2 whitespace-nowrap">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor }} />
      <span className="text-stone-600">{rotulo}</span>
      {valor && <strong className="text-stone-900">{valor}</strong>}
    </p>
  );
}

/** Legenda com o valor na linha de baixo (para valores longos não vazarem do cartão). */
function ValorLegenda({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-2 text-stone-600">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor }} />
        {rotulo}
      </p>
      <p className="truncate pl-[18px] font-semibold text-stone-900">{valor}</p>
    </div>
  );
}

/** Anel de progresso (0 a 1). */
function Anel({ valor }: { valor: number }) {
  const p = Math.max(0, Math.min(1, valor)) * 100;
  return (
    <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0 -rotate-90" role="img" aria-label={`Aproveitamento de ${Math.round(p)}%`}>
      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#fee2e2" strokeWidth="5" />
      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#0d6b45" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${p} ${100 - p}`} />
      <text x="21" y="21" transform="rotate(90 21 21)" textAnchor="middle" dominantBaseline="central" className="fill-stone-900 font-display text-[9px] font-extrabold">
        {Math.round(p)}%
      </text>
    </svg>
  );
}

/** Rosca com várias partes (valores somando 1). */
function Rosca({ partes, centro }: { partes: { valor: number; cor: string }[]; centro: string }) {
  let acumulado = 0;
  return (
    <svg viewBox="0 0 42 42" className="h-28 w-28 shrink-0" role="img" aria-label="Perdas por motivo">
      <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f5f5f4" strokeWidth="6" />
      {partes.map((p, i) => {
        const tam = p.valor * 100;
        const el = (
          <circle
            key={i}
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={p.cor}
            strokeWidth="6"
            strokeDasharray={`${tam} ${100 - tam}`}
            strokeDashoffset={25 - acumulado}
          />
        );
        acumulado += tam;
        return el;
      })}
      <text x="21" y="21" textAnchor="middle" dominantBaseline="central" className="fill-stone-900 font-display text-[4px] font-extrabold">
        {centro}
      </text>
    </svg>
  );
}
