import type { SubjectXp } from "@/lib/brain";

/**
 * Barras horizontais em vez de pizza: comparar comprimentos é mais preciso que
 * comparar ângulos, e sobra espaço para o rótulo de cada matéria.
 *
 * A cor segue a matéria (a mesma do resto do app), e as cores das matérias são
 * escolhidas pelo usuário — não passam nas checagens de daltonismo. Por isso a
 * identidade nunca depende da cor: cada barra tem nome, XP e porcentagem escritos.
 */
export function SubjectBreakdown({ data }: { data: SubjectXp[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        Nenhum XP registrado por matéria ainda.
      </p>
    );
  }

  const total = data.reduce((sum, item) => sum + item.xp, 0);

  return (
    <ul className="space-y-3">
      {data.map((subject) => {
        const percent = Math.round((subject.xp / total) * 100);

        return (
          <li key={subject.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="truncate text-foreground">{subject.name}</span>
              </span>
              <span className="shrink-0 text-xs text-muted">
                {subject.xp} XP · {percent}%
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full"
                // Largura proporcional ao total, não ao maior valor: assim o
                // comprimento da barra bate com a porcentagem escrita ao lado.
                style={{
                  width: `${(subject.xp / total) * 100}%`,
                  backgroundColor: subject.color,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
