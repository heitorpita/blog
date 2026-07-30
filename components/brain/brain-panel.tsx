"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ProgressBar } from "@/components/ui/progress-bar";
import { xpProgress } from "@/lib/xp";

const BrainScene = dynamic(
  () => import("@/components/brain/brain-scene").then((m) => m.BrainScene),
  { ssr: false },
);

export function BrainPanel({ totalXp, streak }: { totalXp: number; streak: number }) {
  const [open, setOpen] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [visible, setVisible] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const { level, title, xp, xpIntoLevel, xpNeededForNext, progress, percent } =
    xpProgress(totalXp);

  // O painel vive no shell, ou seja, em TODA rota. Sem isto o `<Canvas>` mantinha
  // um loop de requestAnimationFrame girando a rede neural para sempre — inclusive
  // no celular, onde o painel fica com `display:none`, e enquanto o usuário só lê
  // um post. Elemento escondido ou fora da tela não intersecta, então o canvas
  // desmonta sozinho e para de queimar GPU e bateria.
  useEffect(() => {
    const element = sceneRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Compara com o nível do render anterior para comemorar só na transição —
  // o primeiro render nunca conta como subida de nível.
  const previousLevel = useRef<number | null>(null);

  useEffect(() => {
    if (previousLevel.current !== null && level > previousLevel.current) {
      previousLevel.current = level;
      setLevelUp(true);
      const timeout = setTimeout(() => setLevelUp(false), 4000);
      return () => clearTimeout(timeout);
    }

    previousLevel.current = level;
  }, [level]);

  return (
    <aside className="border-t border-border bg-surface md:w-72 md:shrink-0 md:border-l md:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-medium text-foreground md:hidden"
      >
        <span>
          Cérebro · {title} (nível {level})
        </span>
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>

      <div className={clsx("px-5 pb-6 md:block md:pt-6", open ? "block" : "hidden")}>
        <div
          ref={sceneRef}
          className="relative h-56 rounded-lg border border-border bg-background"
        >
          {visible && <BrainScene level={level} levelUp={levelUp} />}

          {levelUp && (
            <div className="pointer-events-none absolute inset-x-0 top-3 text-center">
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-[#0f0f14]">
                Nível {level} · {title}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-2xl text-foreground">{title}</span>
            <span className="text-xs text-muted">nível {level}</span>
          </div>

          <ProgressBar progress={progress} />

          <div className="flex items-baseline justify-between text-xs text-muted">
            <span>
              {xpIntoLevel}/{xpNeededForNext} XP para o nível {level + 1}
            </span>
            <span className="font-medium text-foreground">{percent}%</span>
          </div>

          <p className="text-xs text-muted">{xp} XP total</p>

          {streak > 0 && (
            <p className="text-xs text-foreground">
              🔥 {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
