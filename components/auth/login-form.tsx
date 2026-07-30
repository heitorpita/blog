"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    // Esta tela não usa o `fetchJson` compartilhado de propósito: ele manda para
    // /login no 401, o que aqui viraria laço infinito. E precisamos do header
    // Retry-After, que o helper não expõe.
    let response: Response;

    try {
      response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
    } catch {
      setSubmitting(false);
      setError("Sem conexão. Verifique a internet e tente de novo.");
      return;
    }

    setSubmitting(false);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After"));
        setError(
          Number.isFinite(retryAfter) && retryAfter > 0
            ? `Muitas tentativas. Tente de novo em ${Math.ceil(retryAfter / 60)} min.`
            : "Muitas tentativas. Tente de novo mais tarde.",
        );
      } else {
        setError(response.status === 401 ? "Senha incorreta." : "Não foi possível entrar.");
      }
      setPassword("");
      return;
    }

    const from = searchParams.get("from");
    router.replace(from?.startsWith("/") ? from : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Senha"
        autoFocus
        autoComplete="current-password"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
      />

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Button type="submit" disabled={submitting || !password} className="w-full">
        {submitting ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
