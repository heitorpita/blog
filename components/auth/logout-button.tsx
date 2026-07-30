"use client";

import { useRouter } from "next/navigation";
import { fetchJson, jsonBody } from "@/lib/fetch-json";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    // Mesmo se a chamada falhar, sair da tela é o comportamento esperado: o
    // cookie pode já ter expirado, e prender o usuário aqui não ajuda.
    await fetchJson("/api/logout", jsonBody("POST"));
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-foreground"
    >
      Sair
    </button>
  );
}
