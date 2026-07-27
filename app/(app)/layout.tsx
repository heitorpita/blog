import { AppShell } from "@/components/layout/app-shell";

// O shell lê o estado do personagem no banco, então nada aqui pode ser
// prerenderizado em build time — o banco só existe em runtime.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
