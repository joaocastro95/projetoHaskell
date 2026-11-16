"use client";

import { useFormStatus } from "react-dom";

/**
 * Botão de envio que trava enquanto o formulário está sendo processado,
 * evitando lançamentos duplicados por clique repetido.
 */
export function BotaoEnviar({
  children,
  pendente = "Salvando…",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendente?: string }) {
  const { pending, data, action } = useFormStatus();

  // Mostra o texto de "carregando" só no botão clicado, quando há mais de um no formulário:
  // pela ação (botões com formAction) ou pelo name/value.
  const esteBotao =
    pending &&
    (typeof props.formAction === "function"
      ? action === props.formAction
      : !props.name || data?.get(props.name) === String(props.value ?? ""));

  return (
    <button
      {...props}
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
    >
      {esteBotao ? pendente : children}
    </button>
  );
}
