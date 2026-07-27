import Link from "next/link";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BrainPanel } from "@/components/brain/brain-panel";
import { LogoutButton } from "@/components/auth/logout-button";
import { getTotalXp } from "@/lib/xp-ledger";
import { getStreak } from "@/lib/brain";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const [totalXp, streak] = await Promise.all([getTotalXp(), getStreak()]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/dashboard" className="font-serif text-lg text-foreground">
          Sinapse
        </Link>
      </header>

      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface p-5 md:flex">
        <Link href="/dashboard" className="font-serif text-xl text-foreground">
          Sinapse
        </Link>
        <SidebarNav />
        <div className="mt-auto flex flex-col">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">{children}</div>
        </main>

        <BrainPanel totalXp={totalXp} streak={streak.current} />
      </div>
    </div>
  );
}
