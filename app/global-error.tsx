"use client";

// Última rede: só entra em cena quando o próprio layout raiz falha. A doc do
// Next avisa que este arquivo substitui o layout raiz e NÃO recebe os estilos
// globais — por isso o tema escuro do app vem inline aqui, senão a tela sai
// branca e destoando de tudo.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem",
          background: "#0f0f14",
          color: "#e9e8f0",
          colorScheme: "dark",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Erro · Sinapse</title>

        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.5rem",
            background: "#16161d",
            padding: "1.25rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 500 }}>
            Erro inesperado
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#9a97ab" }}>
            O Sinapse falhou antes de conseguir montar a página. Seus dados de estudo estão
            no banco e não foram afetados.
          </p>

          {error.digest && (
            <p
              style={{
                marginTop: "0.75rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.75rem",
                color: "#9a97ab",
              }}
            >
              Referência do erro: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={unstable_retry}
            style={{
              marginTop: "1rem",
              border: 0,
              borderRadius: "0.375rem",
              background: "#7c9dff",
              color: "#0f0f14",
              padding: "0.5rem 0.875rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
