"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Confirmação do próprio site, no lugar de `window.confirm`.
//
// O nativo tem uma armadilha séria: depois de dois diálogos seguidos o navegador
// oferece "impedir que esta página crie caixas de diálogo adicionais", e a partir
// daí `confirm()` retorna `false` SEM MOSTRAR NADA. O código sai calado e o
// usuário conclui que o botão não funciona. Numa tela cheia de itens excluíveis
// isso acontece rápido.
//
// Usa o `<dialog>` nativo, que já traz foco preso, `Esc` para fechar e backdrop —
// nenhuma dependência nova (o projeto não tem Radix nem Headless UI, e não vale
// adicionar uma por causa disto).

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Abrir é sincronizar o DOM com o estado — o efeito não chama setState, que o
  // eslint do projeto (React Compiler) trata como erro.
  useEffect(() => {
    if (!options) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    // O navegador preserva o returnValue entre aberturas; sem zerar, um "Esc"
    // depois de um "confirmar" seria lido como confirmação.
    dialog.returnValue = "";
    dialog.showModal();
  }, [options]);

  const dialog = (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      // Um único ponto de saída: botão, Esc e qualquer close() passam por aqui.
      onClose={() => {
        const confirmed = dialogRef.current?.returnValue === "confirmar";
        resolverRef.current?.(confirmed);
        resolverRef.current = null;
        setOptions(null);
      }}
      className="max-w-sm rounded-lg border border-border bg-surface p-5 text-foreground shadow-xl backdrop:bg-black/60"
    >
      {options && (
        <>
          <h2 id="confirm-dialog-title" className="font-serif text-lg leading-snug">
            {options.title}
          </h2>

          {options.description && (
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{options.description}</p>
          )}

          {/* `method="dialog"` fecha o diálogo e grava o value do botão em
              returnValue, sem JavaScript nenhum. */}
          <form method="dialog" className="mt-5 flex justify-end gap-2">
            <Button type="submit" value="cancelar" variant="ghost">
              {options.cancelLabel ?? "Cancelar"}
            </Button>
            <Button
              type="submit"
              value="confirmar"
              variant={options.tone === "danger" ? "danger" : "primary"}
              autoFocus
            >
              {options.confirmLabel ?? "Confirmar"}
            </Button>
          </form>
        </>
      )}
    </dialog>
  );

  return { confirm, dialog };
}
