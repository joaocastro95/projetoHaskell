import Link from "next/link";
import { Aviso } from "@/components/Aviso";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone, Logo, type NomeIcone } from "@/components/Icone";
import { Cenoura, FaixaLegumes, Folha, Tomate } from "@/components/Legumes";
import { cadastrar, entrar } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aviso?: string }>;
}) {
  const { erro, aviso } = await searchParams;

  return (
    <div className="overflow-x-clip bg-white">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/login" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-display text-lg font-extrabold tracking-tight text-stone-900">
              Perda<span className="text-mata">Zero</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-stone-600 md:flex">
            <a href="#como-funciona" className="hover:text-stone-900">Como funciona</a>
            <a href="#recursos" className="hover:text-stone-900">Recursos</a>
            <a href="#planos" className="hover:text-stone-900">Planos</a>
          </nav>
          <a href="#entrar" className="btn-limao px-5 py-2 text-sm">
            Entrar
          </a>
        </div>
      </header>

      {/* Topo escuro: proposta + login lado a lado */}
      <section className="fundo-noite relative overflow-hidden text-white">
        <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden="true">
          <Cenoura traco="#f4efe2" className="absolute -left-4 top-24 h-24 w-24 -rotate-12 sm:left-6" />
          <Tomate traco="#f4efe2" className="absolute bottom-10 left-[38%] hidden h-16 w-16 rotate-6 lg:block" />
          <Folha traco="#f4efe2" className="absolute right-4 top-6 h-20 w-20 rotate-12 lg:right-[44%]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div>
            <p className="eyebrow">Controle de validade para restaurantes</p>
            <h1 className="mt-5 font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Saiba o que vence <span className="text-limao">antes</span> de virar prejuízo.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-emerald-50/80">
              O PerdaZero avisa o que está para vencer, sugere o que fazer e mostra em reais quanto a
              sua cozinha perde. Simples, no celular, feito para o pequeno restaurante.
            </p>
            <ul className="mt-6 hidden flex-wrap gap-x-6 gap-y-2 text-sm text-emerald-50/80 sm:flex">
              {["Alertas de 7, 3 e 0 dias", "Perdas em R$", "Doação pela Lei 14.016"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Icone nome="check" className="h-4 w-4 text-limao" traco={3} /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Login */}
          <div id="entrar" className="scroll-mt-24">
            <div className="rounded-3xl bg-white p-6 text-stone-900 shadow-2xl shadow-black/30 ring-1 ring-white/10 sm:p-7">
              <h2 className="font-display text-xl font-extrabold tracking-tight">Acesse sua cozinha</h2>
              <p className="mt-1 text-sm text-stone-500">Entre ou crie sua conta grátis em segundos.</p>

              <div className="mt-4 space-y-3 empty:hidden">
                {erro && <Aviso tipo="erro">{erro}</Aviso>}
                {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
              </div>

              <form className="mt-4 space-y-4">
                <label className="block">
                  <span className="rotulo">E-mail</span>
                  <input name="email" type="email" required autoComplete="email" className="campo" />
                </label>
                <label className="block">
                  <span className="rotulo">Senha</span>
                  <input
                    name="senha"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    className="campo"
                  />
                </label>
                <BotaoEnviar formAction={entrar} pendente="Entrando…" className="btn-primario w-full">
                  Entrar <Icone nome="avancar" className="h-4 w-4" traco={2.5} />
                </BotaoEnviar>
                <div className="flex items-center gap-3 text-xs text-stone-400">
                  <span className="h-px flex-1 bg-stone-200" /> primeira vez?
                  <span className="h-px flex-1 bg-stone-200" />
                </div>
                <BotaoEnviar formAction={cadastrar} pendente="Criando conta…" className="btn-secundario w-full">
                  Criar conta grátis
                </BotaoEnviar>
              </form>
            </div>
            <p className="mt-3 text-center text-xs text-emerald-50/60">
              Os dados ficam neste computador, no banco SQLite local.
            </p>
          </div>
        </div>
      </section>

      {/* Números do problema */}
      <section className="bg-[#f3efe4]">
        <FaixaLegumes className="mx-auto max-w-6xl overflow-hidden px-4 pt-8 sm:px-6" />
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {[
            ["≈ 5 kg", "de comida sobram por dia, em média, em cada restaurante"],
            ["2ª", "maior despesa de um restaurante são os insumos"],
            ["9,7%", "dos restaurantes conhecem a lei de doação de excedentes"],
          ].map(([n, t]) => (
            <div key={n}>
              <p className="font-display text-4xl font-extrabold tracking-tight text-mata">{n}</p>
              <p className="mt-1 text-sm text-stone-600">{t}</p>
            </div>
          ))}
          <p className="text-xs text-stone-400 sm:col-span-3">Fonte: ABRASEL apud MENDES (2025).</p>
        </div>
      </section>

      {/* Como funciona + prévia do painel */}
      <section id="como-funciona" className="scroll-mt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow text-mata before:bg-mata">Como funciona</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              Três passos, direto do celular da cozinha
            </h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Cadastre o que chegou", "Insumo, quantidade, quanto pagou e a validade com um toque. Produtos repetidos são sugeridos."],
                ["Receba o alerta", "O painel separa o que venceu, vence hoje, em 3 e em 7 dias, com o valor em risco."],
                ["Dê o destino certo", "Prato do dia, promoção, doação ou descarte com motivo. Tudo vira relatório em R$."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-limao font-display font-extrabold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-stone-900">{t}</p>
                    <p className="mt-0.5 text-stone-600">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <PreviaPainel />
        </div>
      </section>

      {/* Recursos em blocos */}
      <section id="recursos" className="scroll-mt-16 bg-stone-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow text-mata before:bg-mata">Recursos</p>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Tudo o que a cozinha precisa para parar de jogar dinheiro fora
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Bloco icone="perdas" titulo="Relatório de perdas em R$" texto="Quanto foi para o lixo no mês, por motivo, e os insumos campeões de perda." largo>
              <div className="mt-5 flex h-28 items-end gap-3 rounded-xl bg-stone-50 p-4">
                {[100, 77, 63, 30].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="w-full max-w-10 rounded-t-md bg-red-400" style={{ height: `${h * 0.7}px` }} />
                    <span className="text-[10px] text-stone-500">{["ago", "set", "out", "nov"][i]}</span>
                  </div>
                ))}
                <div className="ml-2 self-center rounded-lg bg-emerald-50 px-3 py-2 text-center">
                  <p className="font-display text-lg font-extrabold text-emerald-700">▼ 37%</p>
                  <p className="text-[10px] text-emerald-800">de perdas</p>
                </div>
              </div>
            </Bloco>
            <Bloco icone="folha" titulo="Doação com segurança" texto="Sugere doar com folga de validade e bloqueia o uso de lote vencido (RDC 216 e Lei 14.016)." />
            <Bloco icone="alerta" titulo="Alertas por urgência" texto="Vencidos, vence hoje, até 3 e até 7 dias, sempre na ordem de quem vence primeiro." />
            <Bloco icone="estoque" titulo="Estoque por lote" texto="Lote, validade, quantidade e custo de cada entrada, com busca e filtros." />
            <Bloco icone="check" titulo="Diagnóstico da perda" texto="Vencido, estragado ou sobra: cada motivo aponta se o problema é compra, armazenamento ou produção." />
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow text-mata before:bg-mata">Planos</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Comece grátis
          </h2>
          <p className="mt-2 text-stone-600">Durante o piloto em Santos, todos os recursos estão liberados.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { nome: "Grátis", preco: "R$ 0", itens: ["Até 30 insumos", "Alertas de validade"] },
              { nome: "Básico", preco: "R$ 49", itens: ["Insumos ilimitados", "Relatório de perdas em R$"], destaque: true },
              { nome: "Pro", preco: "R$ 89", itens: ["Vários usuários", "Sugestões e doação"] },
            ].map((p) => (
              <div
                key={p.nome}
                className={`rounded-3xl border p-6 ${p.destaque ? "fundo-noite border-transparent text-white shadow-xl" : "border-stone-200 bg-white"}`}
              >
                <p className={`font-semibold ${p.destaque ? "text-limao" : "text-mata"}`}>{p.nome}</p>
                <p className="mt-2 font-display text-4xl font-extrabold tracking-tight">
                  {p.preco}
                  <span className={`text-base font-medium ${p.destaque ? "text-emerald-50/70" : "text-stone-500"}`}>/mês</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.itens.map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Icone nome="check" className={`h-4 w-4 ${p.destaque ? "text-limao" : "text-mata"}`} traco={3} />
                      {i}
                    </li>
                  ))}
                </ul>
                <a href="#entrar" className={`mt-6 w-full ${p.destaque ? "btn-limao" : "btn-secundario"}`}>
                  Começar
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="fundo-noite text-emerald-50/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="font-display font-bold text-white">PerdaZero</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Bloco({
  icone,
  titulo,
  texto,
  largo,
  children,
}: {
  icone: NomeIcone;
  titulo: string;
  texto: string;
  largo?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl bg-white p-6 shadow-[0_8px_24px_-12px_rgba(20,32,27,0.12)] ${largo ? "md:col-span-2 md:row-span-1" : ""}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-limao/50 text-mata">
        <Icone nome={icone} />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-stone-900">{titulo}</h3>
      <p className="mt-1 text-stone-600">{texto}</p>
      {children}
    </div>
  );
}

/** Ilustração do painel com dados fictícios (cartões flutuantes). */
function PreviaPainel() {
  const linhas = [
    { nome: "Peito de frango", info: "4 kg · R$ 72,00", selo: "Vence hoje", cor: "bg-red-100 text-red-800", faixa: "bg-red-500" },
    { nome: "Alface", info: "12 un · R$ 30,00", selo: "Até 3 dias", cor: "bg-amber-100 text-amber-900", faixa: "bg-amber-500" },
    { nome: "Queijo muçarela", info: "2 kg · R$ 80,00", selo: "Até 7 dias", cor: "bg-yellow-100 text-yellow-900", faixa: "bg-yellow-400" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="fundo-noite absolute -inset-4 rounded-[2rem] sm:-inset-6" />
      <div className="relative rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="font-display font-bold text-stone-900">Agir agora</p>
          <p className="text-xs text-stone-500">Em risco: <strong className="text-stone-900">R$ 182,00</strong></p>
        </div>
        <ul className="mt-3 space-y-2">
          {linhas.map((l) => (
            <li key={l.nome} className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-stone-200 py-2.5 pl-4 pr-2">
              <span className={`absolute inset-y-0 left-0 w-1.5 ${l.faixa}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900">
                  {l.nome}{" "}
                  <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${l.cor}`}>{l.selo}</span>
                </p>
                <p className="text-xs text-stone-500">{l.info}</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-limao/50 text-mata">
                <Icone nome="usar" className="h-4 w-4" traco={2.5} />
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 rounded-full bg-mata py-2.5 text-center text-sm font-semibold text-white">
          Usar frango no prato do dia
        </div>
      </div>
      <div className="relative -mt-4 ml-auto mr-[-0.5rem] w-60 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-stone-200 sm:mr-[-2rem]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-limao/50 text-mata">
            <Icone nome="perdas" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-900">Perdas caíram 37%</p>
            <p className="text-xs text-stone-500">em relação a 2 meses atrás</p>
          </div>
        </div>
      </div>
    </div>
  );
}
