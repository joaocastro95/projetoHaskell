import { Icone } from "./Icone";

export function Aviso({ tipo, children }: { tipo: "ok" | "erro" | "info"; children: React.ReactNode }) {
  const estilo = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
    erro: "border-red-200 bg-red-50 text-red-900",
    info: "border-amber-200 bg-amber-50 text-amber-900",
  }[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`flex gap-2.5 rounded-xl border p-3 text-sm ${estilo}`}>
      <Icone nome={tipo === "ok" ? "check" : "alerta"} className="mt-0.5 h-4 w-4 shrink-0" traco={2.5} />
      <div>{children}</div>
    </div>
  );
}
