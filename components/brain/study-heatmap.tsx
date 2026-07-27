"use client";

import type { HeatmapDay } from "@/lib/brain";
import { formatMinutes } from "@/lib/format";

// Rampa sequencial de um hue só, escuro → claro (pouco → muito), tirada da escala
// azul de referência (passos 600/500/400/300). O passo mais baixo recua para perto
// da superfície de propósito: é "quase zero". Por ficar abaixo de 3:1, a leitura
// não depende dele — cada célula tem tooltip e há legenda embaixo.
const STEPS = ["#184f95", "#256abf", "#3987e5", "#6da7ec"];
const EMPTY = "#1c1c26";

function stepFor(minutes: number) {
  if (minutes <= 0) return EMPTY;
  if (minutes < 30) return STEPS[0];
  if (minutes < 60) return STEPS[1];
  if (minutes < 120) return STEPS[2];
  return STEPS[3];
}

const WEEKDAY_LABELS = ["", "Seg", "", "Qua", "", "Sex", ""];

export function StudyHeatmap({ data }: { data: HeatmapDay[] }) {
  // A consulta já entrega a grade começando num domingo, então fatiar de 7 em 7
  // dá exatamente uma semana por coluna.
  const weeks: HeatmapDay[][] = [];
  for (let index = 0; index < data.length; index += 7) {
    weeks.push(data.slice(index, index + 7));
  }

  const totalDays = data.filter((day) => day.minutes > 0).length;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="flex gap-[3px]">
          <div className="mr-1 flex flex-col gap-[3px] pt-[1px]">
            {WEEKDAY_LABELS.map((label, index) => (
              <span
                key={index}
                className="h-[11px] text-[9px] leading-[11px] text-muted"
                style={{ width: 22 }}
              >
                {label}
              </span>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <div
                  key={day.day}
                  title={`${new Date(`${day.day}T12:00:00Z`).toLocaleDateString("pt-BR")} · ${
                    day.minutes > 0 ? formatMinutes(day.minutes) : "sem estudo"
                  }`}
                  className="size-[11px] rounded-[2px]"
                  style={{ backgroundColor: stepFor(day.minutes) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>{totalDays} dias com estudo registrado</span>

        <div className="flex items-center gap-1.5">
          <span>menos</span>
          <span className="size-[11px] rounded-[2px]" style={{ backgroundColor: EMPTY }} />
          {STEPS.map((step) => (
            <span
              key={step}
              className="size-[11px] rounded-[2px]"
              style={{ backgroundColor: step }}
            />
          ))}
          <span>mais</span>
        </div>
      </div>
    </div>
  );
}
