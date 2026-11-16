import Link from "next/link";
import {
  ROTULO_ALERTA,
  brl,
  dataBR,
  diasAte,
  nivelAlerta,
  qtd,
  textoDias,
  type Lote,
  type NivelAlerta,
} from "@/lib/format";
import { Icone } from "./Icone";

const FAIXA: Record<NivelAlerta, string> = {
  vencido: "bg-red-600",
  hoje: "bg-red-500",
  "3dias": "bg-amber-500",
  "7dias": "bg-yellow-400",
  ok: "bg-emerald-500",
};

const SELO: Record<NivelAlerta, string> = {
  vencido: "bg-red-600 text-white",
  hoje: "bg-red-100 text-red-800",
  "3dias": "bg-amber-100 text-amber-900",
  "7dias": "bg-yellow-100 text-yellow-900",
  ok: "bg-emerald-50 text-emerald-800",
};

/**
 * Cartão de lote com ações de 1 toque. `voltar` é a tela para onde o usuário
 * retorna depois de registrar o uso/descarte.
 */
export function LoteCard({ lote, hoje, voltar }: { lote: Lote; hoje: string; voltar: string }) {
  const dias = diasAte(lote.validade, hoje);
  const nivel = nivelAlerta(dias);
  const valor = lote.quantidade * lote.custo_unitario;
  const destino = (tipo: "uso" | "descarte") =>
    `/lotes/${lote.id}?tipo=${tipo}&voltar=${encodeURIComponent(voltar)}`;

  return (
    <li className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-3 pl-5">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${FAIXA[nivel]}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-semibold text-stone-900">{lote.produto}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SELO[nivel]}`}>
            {nivel === "ok" ? textoDias(dias) : ROTULO_ALERTA[nivel]}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-stone-600">
          {qtd(lote.quantidade, lote.unidade)} · <span className="font-medium text-stone-800">{brl(valor)}</span>
        </p>
        <p className="text-xs text-stone-500">
          Validade {dataBR(lote.validade)}
          {nivel !== "ok" && ` · ${textoDias(dias)}`}
          {lote.lote ? ` · lote ${lote.lote}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {dias >= 0 && (
          <Link
            href={destino("uso")}
            aria-label={`Usar ${lote.produto}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 transition active:scale-95 sm:w-auto sm:px-3"
          >
            <Icone nome="usar" className="h-5 w-5" traco={2.5} />
            <span className="ml-1.5 hidden text-sm font-semibold sm:inline">Usar</span>
          </Link>
        )}
        <Link
          href={destino("descarte")}
          aria-label={`Descartar ${lote.produto}`}
          className={`flex h-11 items-center justify-center rounded-xl transition active:scale-95 ${
            dias < 0
              ? "bg-red-600 px-3 text-white"
              : "w-11 border border-red-200 bg-red-50 text-red-700 sm:w-auto sm:px-3"
          }`}
        >
          <Icone nome="lixo" className="h-5 w-5" />
          <span className={`ml-1.5 text-sm font-semibold ${dias < 0 ? "" : "hidden sm:inline"}`}>
            Descartar
          </span>
        </Link>
      </div>
    </li>
  );
}
