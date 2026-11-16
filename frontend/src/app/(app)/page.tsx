import Link from "next/link";
import { Aviso } from "@/components/Aviso";
import { Icone } from "@/components/Icone";
import { Brocolis, Cenoura, Tomate } from "@/components/Legumes";
import { LoteCard } from "@/components/LoteCard";
import {
  brl,
  diasAte,
  hojeISO,
  nivelAlerta,
  somarDias,
  type Lote,
  type NivelAlerta,
} from "@/lib/format";
import { resumoMensal, rotuloMes, saudacao } from "@/lib/resumo";
import { api, listarLotes, requireUser } from "@/lib/api";

const GRUPOS: { nivel: Exclude<NivelAlerta, "ok">; titulo: string; curto: string; dica: string; ponto: string }[] = [
  { nivel: "vencido", titulo: "Vencidos", curto: "Vencidos", dica: "Não use nem doe. Registre o descarte.", ponto: "bg-red-600" },
  { nivel: "hoje", titulo: "Vencem hoje", curto: "Hoje", dica: "Use no prato do dia ou faça promoção agora.", ponto: "bg-red-400" },
  { nivel: "3dias", titulo: "Próximos 3 dias", curto: "3 dias", dica: "Planeje o prato do dia ou doe com folga.", ponto: "bg-amber-500" },
  { nivel: "7dias", titulo: "Até 7 dias", curto: "7 dias", dica: "Fique de olho e use primeiro.", ponto: "bg-yellow-400" },
];

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Sao_Paulo" });

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ bemvindo?: string; ok?: string }>;
}) {
  const { bemvindo, ok } = await searchParams;
  const { user } = await requireUser();
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const restaurante = user.restaurante?.trim();

  const [todos, totalLotes, resumo] = await Promise.all([
    listarLotes(),
    api<number>("GET", "/lotes/contagem"),
    resumoMensal(),
  ]);
  const lotes = todos.filter((l) => l.validade <= somarDias(hoje, 7));

  const cabecalho = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-stone-900 sm:text-4xl">
        {saudacao()},{" "}
        <span className="text-stone-400">{restaurante || "chef"}</span>
      </h1>
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium capitalize text-stone-700 shadow-sm">
        <Icone nome="calendario" className="h-4 w-4" />
        {DATA_CURTA.format(new Date())}
      </span>
    </div>
  );

  // Primeiro acesso: nada cadastrado ainda
  if (!totalLotes) {
    return (
      <div className="space-y-6">
        {bemvindo && <Aviso tipo="ok">Conta criada. Bem-vindo ao PerdaZero!</Aviso>}
        {cabecalho}
        <div className="fundo-noite relative overflow-hidden rounded-3xl p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-6 bottom-0 hidden gap-2 opacity-90 sm:flex" aria-hidden="true">
            <Cenoura traco="#f4efe2" className="h-32 w-32 -rotate-12" />
            <Tomate traco="#f4efe2" className="mt-14 h-24 w-24 rotate-6" />
          </div>
          <div className="relative max-w-md space-y-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-limao text-noite">
              <Icone nome="folha" className="h-6 w-6" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Vamos começar</h2>
            <p className="text-emerald-50/80">
              Cadastre o que chegou do fornecedor. O PerdaZero avisa o que vai vencer e mostra quanto
              você perde em R$.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/insumos/novo" className="btn-limao">
                <Icone nome="mais" traco={2.5} /> Cadastrar primeira entrada
              </Link>
              <Link href="/conta" className="btn-secundario border-white/20 bg-white/10 text-white hover:bg-white/20">
                Ver com dados de exemplo
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const lista = (lotes ?? []) as Lote[];
  const porNivel = new Map<NivelAlerta, Lote[]>();
  // "Em risco" = ainda dá para salvar (vence de hoje a 7 dias). Vencido já é perda.
  let valorEmRisco = 0;
  let lotesEmRisco = 0;
  let valorHoje = 0;
  let valorVencido = 0;
  for (const l of lista) {
    const n = nivelAlerta(diasAte(l.validade, hoje));
    porNivel.set(n, [...(porNivel.get(n) ?? []), l]);
    const v = l.quantidade * l.custo_unitario;
    if (n === "vencido") {
      valorVencido += v;
      continue;
    }
    valorEmRisco += v;
    lotesEmRisco++;
    if (n === "hoje") valorHoje += v;
  }

  const { meses, porMes } = resumo;
  const atual = porMes.get(mesAtual)!;
  const anterior = porMes.get(meses[meses.length - 2])!;
  const maiorPerda = Math.max(1, ...meses.map((m) => porMes.get(m)!.perda));
  // Tendência: último mês fechado vs. o anterior a ele
  const fechado = porMes.get(meses[meses.length - 2])!.perda;
  const antesFechado = porMes.get(meses[meses.length - 3])!.perda;
  const variacao = antesFechado > 0 ? Math.round(((fechado - antesFechado) / antesFechado) * 100) : null;

  return (
    <div className="space-y-6">
      {bemvindo && <Aviso tipo="ok">Conta criada. Bem-vindo ao PerdaZero!</Aviso>}
      {ok && <Aviso tipo="ok">{ok}</Aviso>}
      {cabecalho}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Cartão principal: dinheiro em risco */}
        <section className="order-1 flex flex-col gap-4 md:order-1">
          <div className="fundo-noite relative overflow-hidden rounded-3xl p-5 text-white">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">Em risco</p>
                <p className="text-xs text-emerald-50/60">vence nos próximos 7 dias</p>
              </div>
              <Link href="/insumos?f=7dias" aria-label="Ver no estoque" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
                <Icone nome="diagonal" className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-6 font-display text-4xl font-extrabold tracking-tight">{brl(valorEmRisco)}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-emerald-50/70">{lotesEmRisco} lote(s)</span>
              {valorHoje > 0 ? (
                <span className="rounded-full bg-limao px-2.5 py-1 text-xs font-bold text-noite">
                  {brl(valorHoje)} vence hoje
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">nada vence hoje</span>
              )}
            </div>
            {valorVencido > 0 && (
              <a href="#vencido" className="mt-3 block rounded-2xl bg-red-500/15 px-3 py-2 text-xs text-red-100 ring-1 ring-red-400/30">
                + {brl(valorVencido)} já vencido: registre o descarte
              </a>
            )}
          </div>
        </section>

        {/* Gráfico de perdas por mês */}
        <section className="cartao order-4 md:order-2 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="seta-canto border-0 bg-stone-100">
                <Icone nome="perdas" className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-stone-900">Perdas por mês</p>
                <p className="text-xs text-stone-500">valor descartado nos últimos 6 meses</p>
              </div>
            </div>
            <Link href="/relatorio" aria-label="Abrir relatório" className="seta-canto">
              <Icone nome="diagonal" className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid h-44 grid-cols-6 items-end gap-2 sm:gap-4">
            {meses.map((m) => {
              const v = porMes.get(m)!.perda;
              const destaque = m === meses[meses.length - 2]; // último mês fechado
              const altura = Math.max(6, (v / maiorPerda) * 100);
              return (
                <Link key={m} href={`/relatorio?mes=${m}`} className="group flex h-full flex-col items-center justify-end gap-2">
                  {destaque && v > 0 && (
                    <span className="rounded-full bg-mata px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs">
                      {brl(v).replace(",00", "")}
                    </span>
                  )}
                  <span
                    className={`w-full max-w-14 rounded-full transition group-hover:opacity-80 ${
                      destaque ? "bg-mata" : m === mesAtual ? "border-2 border-dashed border-mata/40 bg-mata/10" : "bg-mata/30"
                    }`}
                    style={{
                      height: `${altura}%`,
                      backgroundImage: destaque || m === mesAtual
                        ? undefined
                        : "repeating-linear-gradient(135deg, rgba(255,255,255,.35) 0 6px, transparent 6px 12px)",
                    }}
                  />
                  <span className={`text-xs capitalize ${destaque ? "font-bold text-stone-900" : "text-stone-500"}`}>
                    {rotuloMes(m)}
                  </span>
                </Link>
              );
            })}
          </div>
          {variacao !== null && (
            <p className="mt-4 flex items-center gap-2 text-sm text-stone-600">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${variacao <= 0 ? "bg-limao text-noite" : "bg-red-100 text-red-700"}`}>
                {variacao <= 0 ? "▼" : "▲"} {Math.abs(variacao)}%
              </span>
              em {rotuloMes(meses[meses.length - 2])} vs. {rotuloMes(meses[meses.length - 3])}
            </p>
          )}
        </section>

        {/* Agir agora */}
        <section className="cartao order-2 md:order-3 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-stone-900">O que fazer agora</p>
              <p className="text-xs text-stone-500">na ordem de quem vence primeiro</p>
            </div>
            <Link href="/insumos" aria-label="Ver estoque" className="seta-canto">
              <Icone nome="diagonal" className="h-4 w-4" />
            </Link>
          </div>

          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {GRUPOS.map((g) => {
              const n = porNivel.get(g.nivel)?.length ?? 0;
              return (
                <a
                  key={g.nivel}
                  href={n ? `#${g.nivel}` : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                    n ? "border-stone-200 bg-white text-stone-800" : "border-transparent bg-stone-100 text-stone-400"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${n ? g.ponto : "bg-stone-300"}`} />
                  {g.curto}
                  <strong>{n}</strong>
                </a>
              );
            })}
          </div>

          {lista.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
              <Brocolis className="h-20 w-20" />
              <p className="font-semibold">Tudo em dia</p>
              <p className="text-sm text-stone-500">Nada vence nos próximos 7 dias.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {GRUPOS.map((g) => {
                const itens = porNivel.get(g.nivel);
                if (!itens?.length) return null;
                return (
                  <div key={g.nivel} id={g.nivel} className="scroll-mt-24 space-y-2">
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      <span className={`h-2 w-2 rounded-full ${g.ponto}`} />
                      {g.titulo}
                      <span className="font-normal text-stone-500">· {g.dica}</span>
                    </p>
                    <ul className="space-y-2">
                      {itens.map((l) => (
                        <LoteCard key={l.id} lote={l} hoje={hoje} voltar="/" />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Perdido e salvo no mês */}
        <section className="order-3 flex flex-col gap-4 md:order-4">
          <Link href="/relatorio" className="cartao block transition hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-stone-900">Perdido no mês</p>
                <p className="text-xs text-stone-500">descartes de {rotuloMes(mesAtual)}</p>
              </div>
              <span className="seta-canto">
                <Icone nome="diagonal" className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 font-display text-3xl font-extrabold tracking-tight text-red-700">{brl(atual.perda)}</p>
            <p className="mt-1 text-xs text-stone-500">mês anterior: {brl(anterior.perda)}</p>
          </Link>
          <div className="cartao">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-limao/50 text-mata">
                <Icone nome="folha" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-stone-900">Salvo no mês</p>
                <p className="text-xs text-stone-500">prato do dia, promoção e doação</p>
              </div>
            </div>
            <p className="mt-4 font-display text-3xl font-extrabold tracking-tight text-mata">{brl(atual.salvo)}</p>
            {atual.doado > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                <Icone nome="doar" className="h-3.5 w-3.5" /> {brl(atual.doado)} doados
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
