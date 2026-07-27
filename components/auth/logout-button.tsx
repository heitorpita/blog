"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
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
