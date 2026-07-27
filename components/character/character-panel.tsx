"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import clsx from "clsx";
import { ProgressBar } from "@/components/ui/progress-bar";
import { xpProgress } from "@/lib/xp";

const CharacterScene = dynamic(
  () => import("@/components/character/character-scene").then((m) => m.CharacterScene),
  { ssr: false },
);

export function CharacterPanel({ totalXp }: { totalXp: number }) {
  const [open, setOpen] = useState(false);
  const { level, xp, xpIntoLevel, xpNeededForNext, progress } = xpProgress(totalXp);

  return (
    <aside className="border-t border-border bg-surface md:w-72 md:shrink-0 md:border-l md:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-foreground md:hidden"
      >
        <span>Personagem · Nível {level}</span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      <div className={clsx("px-5 pb-6 md:block md:pt-6", open ? "block" : "hidden")}>
        <div className="h-56 rounded-lg border border-border bg-background">
          <CharacterScene level={level} />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-2xl text-foreground">Nível {level}</span>
            <span className="text-xs text-muted">{xp} XP total</span>
          </div>
          <ProgressBar progress={progress} />
          <p className="text-xs text-muted">
            {xpIntoLevel} / {xpNeededForNext} XP para o nível {level + 1}
          </p>
        </div>
      </div>
    </aside>
  );
}
