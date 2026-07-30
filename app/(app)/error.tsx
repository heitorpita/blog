"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Erro dentro de uma página do app. O shell (navegação e painel do cérebro)
// continua em volta, então dá para ir para outra seção sem recarregar tudo.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Em produção o Next não manda a mensagem original para o cliente, só o
    // digest — que é o que liga esta tela à linha correspondente no log.
    console.error(error);
  }, [error]);

  return (
    <Card className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl text-foreground">Algo quebrou aqui</h1>
        <p className="mt-2 text-sm text-muted">
          A página não conseguiu carregar. Costuma ser o banco reiniciando — tentar de novo
          em alguns segundos normalmente resolve. Seus dados não foram afetados.
        </p>
      </div>

      {error.digest && (
        <p className="font-mono text-xs text-muted">Referência do erro: {error.digest}</p>
      )}

      <Button onClick={unstable_retry}>Tentar de novo</Button>
    </Card>
  );
}
