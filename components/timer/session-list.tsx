"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SessionForm, type SessionDraft, type SubjectOption } from "@/components/timer/session-form";
import { fetchJson, jsonBody } from "@/lib/fetch-json";
import { formatDate, formatMinutes } from "@/lib/format";

// Sessões recentes, agora editáveis. Antes eram só leitura: digitar 500 min no
// lugar de 50 inflava o XP para sempre, sem nenhum caminho de correção.

export type SessionRow = SessionDraft & {
  xpEarned: number;
  endedAt: string;
  subjectName: string;
  subjectColor: string;
  topicTitle: string | null;
};

export function SessionList({
  sessions,
  subjects,
}: {
  sessions: SessionRow[];
  subjects: SubjectOption[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function remove(session: SessionRow) {
    const ok = await confirm({
      title: `Excluir esta sessão de ${formatMinutes(session.durationMinutes)}?`,
      description: `Os ${session.xpEarned} XP dela voltam atrás.\nNão dá para desfazer.`,
      confirmLabel: "Excluir sessão",
      tone: "danger",
    });

    if (!ok) return;

    setError(null);
    setBusyId(session.id);
    const result = await fetchJson(`/api/sessions/${session.id}`, jsonBody("DELETE"));
    setBusyId(null);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-3">
      {dialog}

      <ul className="divide-y divide-border">
        {sessions.length === 0 && (
          <li className="py-4 text-sm text-muted">Nenhuma sessão ainda.</li>
        )}

        {sessions.map((session) =>
          editingId === session.id ? (
            <li key={session.id} className="py-3">
              <SessionForm
                subjects={subjects}
                session={session}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li
              key={session.id}
              className={busyId === session.id ? "py-3 opacity-60" : "py-3"}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: session.subjectColor }}
                  />
                  <span className="truncate text-foreground">{session.subjectName}</span>
                  {session.topicTitle && (
                    <span className="truncate text-xs text-muted">· {session.topicTitle}</span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{formatMinutes(session.durationMinutes)}</span>
                  <span>+{session.xpEarned} XP</span>
                  <span>{formatDate(session.endedAt)}</span>

                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    onClick={() => setEditingId(session.id)}
                    disabled={busyId === session.id}
                  >
                    Editar
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(session)}
                    disabled={busyId === session.id}
                    aria-label="Excluir sessão"
                    className="flex size-7 shrink-0 items-center justify-center rounded text-base leading-none text-muted/60 transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:text-rose-400"
                  >
                    ×
                  </button>
                </div>
              </div>

              {session.note && (
                <p className="mt-1 truncate pl-4 text-xs text-muted">{session.note}</p>
              )}
            </li>
          ),
        )}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
