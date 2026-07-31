import Link from "next/link";
import type { StaleTopic } from "@/lib/queries/subjects";
import { daysBetween, dayKey, todayKey } from "@/lib/time";

// Responde a pergunta que nenhum gráfico respondia: o que estou empurrando com
// a barriga. Ordena pelo que está há mais tempo sem receber estudo.

function comoHaQuantoTempo(dias: number, everStudied: boolean): string {
  const sufixo = everStudied ? "sem estudar" : "na ementa, nunca estudado";

  if (dias <= 0) return everStudied ? "estudado hoje" : `entrou hoje, ainda não estudado`;
  if (dias === 1) return `1 dia ${sufixo}`;
  if (dias < 30) return `${dias} dias ${sufixo}`;

  const meses = Math.floor(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"} ${sufixo}`;
}

export function StaleTopics({ topics }: { topics: StaleTopic[] }) {
  if (topics.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nenhum tópico pendente. A ementa toda está estudada.
      </p>
    );
  }

  const hoje = todayKey();

  return (
    <ul className="divide-y divide-border">
      {topics.map((topic) => {
        const dias = daysBetween(dayKey(topic.lastActivity), hoje);

        return (
          <li key={topic.id} className="flex items-center gap-3 py-3">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: topic.subjectColor }}
            />

            <div className="min-w-0 flex-1">
              <Link
                href={`/subjects/${topic.subjectId}`}
                className="block truncate text-sm text-foreground transition-colors hover:text-accent"
              >
                {topic.title}
              </Link>
              <p className="truncate text-xs text-muted">{topic.subjectName}</p>
            </div>

            <span className="shrink-0 text-xs tabular-nums text-muted">
              {comoHaQuantoTempo(dias, topic.everStudied)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
