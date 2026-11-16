"use client";

import { useMemo, useRef, useState } from "react";
import { ehInteira, lerNumero } from "@/lib/format";
import { BotaoEnviar } from "./BotaoEnviar";

export type ProdutoConhecido = {
  produto: string;
  unidade: string;
  custo_unitario: number;
  vida: number; // dias entre recebimento e validade na última entrada
};

const UNIDADES = ["kg", "g", "L", "mL", "un", "cx", "pct", "dz"];
const PRAZOS = [1, 3, 5, 7, 15, 30];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Formulário de entrada pensado para o celular: lembra os produtos já cadastrados
 * (unidade e prazo de validade de costume) e define a validade com 1 toque.
 */
export function FormEntrada({
  action,
  hoje,
  conhecidos,
}: {
  action: (fd: FormData) => Promise<void>;
  hoje: string;
  conhecidos: ProdutoConhecido[];
}) {
  const [produto, setProduto] = useState("");
  const [unidade, setUnidade] = useState("kg");
  const [quantidade, setQuantidade] = useState("");
  const [custo, setCusto] = useState("");
  const [recebido, setRecebido] = useState(hoje);
  const [validade, setValidade] = useState("");
  const validadeRef = useRef<HTMLInputElement>(null);

  const conhecido = useMemo(
    () => conhecidos.find((c) => c.produto.toLowerCase() === produto.trim().toLowerCase()),
    [conhecidos, produto],
  );

  function escolherProduto(nome: string) {
    setProduto(nome);
    const c = conhecidos.find((x) => x.produto.toLowerCase() === nome.trim().toLowerCase());
    if (c) {
      setUnidade(c.unidade);
      if (!validade && c.vida > 0) setValidade(somarDias(recebido, c.vida));
    }
  }

  const q = lerNumero(quantidade);
  const ct = lerNumero(custo);
  const porUnidade = q > 0 && ct >= 0 && custo !== "" ? ct / q : null;
  const prazoAtual =
    validade && recebido
      ? Math.round((Date.parse(validade) - Date.parse(recebido)) / 86_400_000)
      : null;

  return (
    <form action={action} className="space-y-4">
      <div className="cartao space-y-4">
        <label className="block">
          <span className="rotulo">Insumo</span>
          <input
            name="produto"
            required
            list="produtos-conhecidos"
            autoComplete="off"
            placeholder="Ex.: Peito de frango"
            value={produto}
            onChange={(e) => escolherProduto(e.target.value)}
            className="campo"
          />
          <datalist id="produtos-conhecidos">
            {conhecidos.map((c) => (
              <option key={c.produto} value={c.produto} />
            ))}
          </datalist>
          {conhecido && (
            <span className="mt-1 block text-xs text-stone-500">
              Última compra: {brl(conhecido.custo_unitario)}/{conhecido.unidade} · validade de{" "}
              {conhecido.vida} dia(s)
            </span>
          )}
        </label>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="block">
            <span className="rotulo">Quantidade</span>
            <input
              name="quantidade"
              required
              inputMode={ehInteira(unidade) ? "numeric" : "decimal"}
              placeholder="0"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="campo"
            />
            {ehInteira(unidade) && quantidade !== "" && !Number.isInteger(q) && (
              <span className="mt-1 block text-xs font-medium text-red-700">Só números inteiros para {unidade}.</span>
            )}
          </label>
          <label className="block">
            <span className="rotulo">Unidade</span>
            <select
              name="unidade"
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              className="campo pr-8"
            >
              {UNIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="rotulo">Quanto pagou pelo lote (R$)</span>
          <input
            name="custo_total"
            required
            inputMode="decimal"
            placeholder="0,00"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            className="campo"
          />
          {porUnidade !== null && Number.isFinite(porUnidade) && (
            <span className="mt-1 block text-xs text-stone-500">
              = {brl(porUnidade)} por {unidade}
              {conhecido && porUnidade > conhecido.custo_unitario * 1.1 && (
                <span className="font-medium text-amber-700"> · mais caro que a última compra</span>
              )}
            </span>
          )}
        </label>
      </div>

      <div className="cartao space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="rotulo">Validade</span>
          {prazoAtual !== null && prazoAtual >= 0 && (
            <span className="text-xs text-stone-500">{prazoAtual} dia(s) após o recebimento</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {conhecido && conhecido.vida > 0 && !PRAZOS.includes(conhecido.vida) && (
            <Prazo dias={conhecido.vida} recebido={recebido} validade={validade} onEscolher={setValidade} destaque />
          )}
          {PRAZOS.map((d) => (
            <Prazo key={d} dias={d} recebido={recebido} validade={validade} onEscolher={setValidade} />
          ))}
          <button
            type="button"
            onClick={() => validadeRef.current?.showPicker?.()}
            className="chip"
          >
            Outra data…
          </button>
        </div>
        <input
          ref={validadeRef}
          name="validade"
          type="date"
          required
          value={validade}
          onChange={(e) => setValidade(e.target.value)}
          className="campo"
        />

        <details className="text-sm">
          <summary className="cursor-pointer text-stone-500">Mais detalhes (lote, data de recebimento)</summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="rotulo">Recebido em</span>
              <input
                name="recebido_em"
                type="date"
                value={recebido}
                onChange={(e) => setRecebido(e.target.value)}
                className="campo"
              />
            </label>
            <label className="block">
              <span className="rotulo">Código do lote</span>
              <input name="lote" placeholder="Opcional" className="campo" />
            </label>
          </div>
        </details>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <BotaoEnviar name="continuar" value="1" className="btn-primario w-full">
          Salvar e cadastrar outro
        </BotaoEnviar>
        <BotaoEnviar name="continuar" value="" className="btn-secundario w-full">
          Salvar e ver estoque
        </BotaoEnviar>
      </div>
    </form>
  );
}

function Prazo({
  dias,
  recebido,
  validade,
  onEscolher,
  destaque,
}: {
  dias: number;
  recebido: string;
  validade: string;
  onEscolher: (v: string) => void;
  destaque?: boolean;
}) {
  const data = somarDias(recebido, dias);
  return (
    <button
      type="button"
      aria-current={validade === data}
      onClick={() => onEscolher(data)}
      className={`chip ${destaque ? "border-emerald-600 text-emerald-800" : ""}`}
    >
      {dias === 1 ? "+1 dia" : `+${dias} dias`}
      {destaque && " (de costume)"}
    </button>
  );
}
