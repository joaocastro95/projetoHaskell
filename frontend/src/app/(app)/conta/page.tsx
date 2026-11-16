import { Aviso } from "@/components/Aviso";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { sair } from "@/app/login/actions";
import { api, requireUser } from "@/lib/api";
import { apagarDados, carregarDemo, salvarPerfil, trocarSenha } from "./actions";

export default async function Conta({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const { user } = await requireUser();
  const count = await api<number>("GET", "/lotes/contagem");
  const restaurante = user.restaurante ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="titulo-pagina">Conta</h1>
        <p className="text-sm text-stone-500">{user.email}</p>
      </div>

      {ok && <Aviso tipo="ok">{ok}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <form action={salvarPerfil} className="cartao space-y-4">
        <div>
          <p className="font-semibold text-stone-900">Seu restaurante</p>
          <p className="text-sm text-stone-500">Aparece na saudação do painel.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="rotulo">Nome</span>
            <input
              name="restaurante"
              defaultValue={restaurante}
              maxLength={60}
              placeholder="Ex.: Cantina da Praia"
              className="campo"
            />
          </label>
          <BotaoEnviar className="btn-primario">Salvar</BotaoEnviar>
        </div>
      </form>

      <form className="cartao space-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-limao/50 text-mata">
            <Icone nome="perdas" className="h-5 w-5" />
          </span>
          <p className="font-semibold text-stone-900">Dados de demonstração</p>
        </div>
        <p className="text-sm text-stone-600">
          Preenche a conta com um restaurante fictício: 3 meses de histórico com as perdas caindo
          mês a mês e um estoque atual com itens em todas as faixas de alerta. Bom para apresentar
          o PerdaZero.
        </p>
        {count ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" name="confirmar" value="1" required className="mt-0.5 h-4 w-4 accent-amber-600" />
            <span>
              Entendo que os <strong>{count} lote(s)</strong> desta conta, com seus usos e descartes,
              serão <strong>apagados</strong>. Use uma conta separada só para demonstração.
            </span>
          </label>
        ) : null}
        <BotaoEnviar formAction={carregarDemo} pendente="Gerando dados…" className="btn-primario w-full">
          Carregar dados de demonstração
        </BotaoEnviar>
      </form>

      <details className="cartao text-sm">
        <summary className="cursor-pointer font-semibold text-stone-900">Apagar todos os meus dados</summary>
        <form className="mt-3 space-y-3">
          <p className="text-red-800">
            Apaga todos os lotes, usos e descartes desta conta. Não dá para desfazer.
          </p>
          <BotaoEnviar formAction={apagarDados} pendente="Apagando…" className="btn-perigo w-full">
            Apagar tudo definitivamente
          </BotaoEnviar>
        </form>
      </details>

      <details className="cartao text-sm">
        <summary className="cursor-pointer font-semibold text-stone-900">Trocar senha</summary>
        <form action={trocarSenha} className="mt-3 space-y-3">
          <label className="block">
            <span className="rotulo">Senha atual</span>
            <input name="senha_atual" type="password" required autoComplete="current-password" className="campo" />
          </label>
          <label className="block">
            <span className="rotulo">Senha nova</span>
            <input name="senha_nova" type="password" required minLength={6} autoComplete="new-password" className="campo" />
          </label>
          <label className="block">
            <span className="rotulo">Repita a senha nova</span>
            <input name="confirmar" type="password" required minLength={6} autoComplete="new-password" className="campo" />
          </label>
          <BotaoEnviar className="btn-primario w-full">Salvar senha nova</BotaoEnviar>
        </form>
      </details>

      <form action={sair}>
        <button className="btn-secundario w-full">
          <Icone nome="sair" className="h-4 w-4" /> Sair
        </button>
      </form>
    </div>
  );
}
