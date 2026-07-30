import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/lib/session";

// O shell lê o estado do personagem no banco, então nada aqui pode ser
// prerenderizado em build time — o banco só existe em runtime.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Layout não roda de novo a cada navegação entre páginas irmãs, então esta
  // checagem cobre só o shell: cada page tem a sua.
  await requireSession();

  return <AppShell>{children}</AppShell>;
}
