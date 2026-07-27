import Link from "next/link";
import { prisma } from "@/lib/db";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { CharacterPanel } from "@/components/character/character-panel";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const character = await prisma.characterState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, totalXp: 0 },
  });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Link href="/dashboard" className="font-serif text-lg text-foreground">
          Studyfolio
        </Link>
      </header>

      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-border bg-surface p-5 md:flex">
        <Link href="/dashboard" className="font-serif text-xl text-foreground">
          Studyfolio
        </Link>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:flex-row">
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">{children}</div>
        </main>

        <CharacterPanel totalXp={character.totalXp} />
      </div>
    </div>
  );
}
