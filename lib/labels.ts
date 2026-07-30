// Rótulos em português dos enums do schema.
//
// Estavam duplicados: PRIORITY_LABEL/PRIORITY_TONE apareciam iguais no dashboard
// e no gerenciador de tarefas, e o texto de status tinha uma terceira versão
// escrita inline em lib/graph.ts. Traduzir o mesmo enum em três lugares é como
// um deles fica para trás quando o enum muda.

import type { TaskPriority, TaskStatus } from "@/lib/generated/prisma/enums";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const PRIORITY_TONE: Record<TaskPriority, BadgeTone> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "danger",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em progresso",
  DONE: "Concluída",
};

/** Ordem do ciclo do checkbox de tarefa. */
export const STATUS_ORDER: TaskStatus[] = ["PENDING", "IN_PROGRESS", "DONE"];
