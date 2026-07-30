"use client";

import { useEffect } from "react";

// Fronteira acima do shell do app. `app/(app)/error.tsx` não cobre o próprio
// layout do grupo, e é justamente ele que lê XP e streak no banco a cada rota —
// então banco fora do ar cai aqui, sem nenhum componente que dependa de dados.
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-5">
        <h1 className="font-serif text-2xl text-foreground">O Sinapse não conseguiu subir</h1>
        <p className="text-sm text-muted">
          Provavelmente o banco de dados está fora do ar ou reiniciando. Nada foi perdido —
          tente de novo em instantes.
        </p>

        {error.digest && (
          <p className="font-mono text-xs text-muted">Referência do erro: {error.digest}</p>
        )}

        <button
          type="button"
          onClick={unstable_retry}
          className="inline-flex items-center justify-center rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-[#0f0f14] transition-colors hover:brightness-110"
        >
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
