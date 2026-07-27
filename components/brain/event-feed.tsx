import type { XpEventItem } from "@/lib/brain";

const SOURCE_LABEL: Record<string, string> = {
  TASK: "Tarefa",
  TOPIC: "Tópico",
  SESSION: "Estudo",
  STREAK: "Streak",
  ADJUSTMENT: "Ajuste",
};

function relativeTime(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function EventFeed({ events }: { events: XpEventItem[] }) {
  if (events.length === 0) {
    return <p className="py-6 text-sm text-muted">Nenhum XP registrado ainda.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {events.map((event) => (
        <li key={event.id} className="flex items-center gap-3 py-3">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: event.subjectColor ?? "var(--muted)" }}
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{event.description}</p>
            <p className="truncate text-xs text-muted">
              {SOURCE_LABEL[event.source] ?? event.source}
              {event.subjectName ? ` · ${event.subjectName}` : ""}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-medium text-emerald-400">+{event.amount} XP</p>
            <p className="text-xs text-muted">{relativeTime(event.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
