"use client";

import { useState } from "react";
import { ehInteira, lerNumero, qtd } from "@/lib/format";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: 3, useGrouping: false });

/** Quantidade com atalhos (tudo / metade) e o valor em R$ calculado na hora. */
export function CampoQuantidade({
  saldo,
  unidade,
  custo,
  tipo,
}: {
  saldo: number;
  unidade: string;
  custo: number;
  tipo: "uso" | "descarte";
}) {
  const inteira = ehInteira(unidade);
  const [valor, setValor] = useState(fmt(saldo));
  const numero = lerNumero(valor);
  const fracaoProibida = inteira && Number.isFinite(numero) && !Number.isInteger(numero);
  const valido = numero > 0 && numero <= saldo && !fracaoProibida;

  const metade = inteira ? Math.floor(saldo / 2) : Math.round((saldo / 2) * 100) / 100;
  const atalhos: [string, number][] = [["Tudo", saldo]];
  if (metade > 0) atalhos.push(["Metade", metade]);

  return (
    <div>
      <label className="rotulo" htmlFor="quantidade">
        Quantidade ({unidade})
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="quantidade"
          name="quantidade"
          required
          inputMode={inteira ? "numeric" : "decimal"}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="campo mt-0 flex-1 text-lg font-semibold"
        />
        {atalhos.map(([rotulo, q]) => (
          <button
            key={rotulo}
            type="button"
            onClick={() => setValor(fmt(q))}
            className="rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 active:scale-95"
          >
            {rotulo}
          </button>
        ))}
      </div>
      <p className={`mt-1.5 text-sm ${valido ? "text-stone-600" : "text-red-700"}`}>
        {valido ? (
          <>
            {tipo === "descarte" ? "Prejuízo" : "Valor"}:{" "}
            <strong className={tipo === "descarte" ? "text-red-700" : "text-emerald-800"}>
              {brl(numero * custo)}
            </strong>{" "}
            · sobra {qtd(Math.max(0, saldo - numero), unidade)}
          </>
        ) : (
          fracaoProibida
            ? `Use um número inteiro: não existe fração de ${unidade}.`
            : `Informe de 0 a ${qtd(saldo, unidade)}.`
        )}
      </p>
    </div>
  );
}
