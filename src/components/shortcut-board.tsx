type Key = { label: string; aria?: string; wide?: boolean };

const P: Key = { label: "P" };
const SPACE: Key = { label: "Espacio", wide: true };
const UP: Key = { label: "↑", aria: "Flecha arriba" };
const DOWN: Key = { label: "↓", aria: "Flecha abajo" };
const SHIFT: Key = { label: "Mayús" };

const SHORTCUTS: { keys: Key[][]; action: string; where: string }[] = [
  { keys: [[P]], action: "Abrir Practicar", where: "Desde cualquier pantalla" },
  { keys: [[SPACE]], action: "Arrancar o parar", where: "Metrónomo" },
  { keys: [[UP, DOWN]], action: "Tempo ±1", where: "Metrónomo" },
  { keys: [[SHIFT], [UP, DOWN]], action: "Tempo ±5", where: "Metrónomo" },
];

/** Chuleta de atajos: solo informativa, las teclas no reaccionan. */
export function ShortcutBoard() {
  return (
    <ul className="divide-y divide-dashed divide-border">
      {SHORTCUTS.map(({ keys, action, where }) => (
        <li
          key={action}
          className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{action}</p>
            <p className="text-xs text-muted">{where}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {keys.map((group, g) => (
              <span key={group[0].label} className="flex items-center gap-1">
                {g > 0 ? (
                  <span
                    aria-hidden="true"
                    className="px-0.5 text-xs text-muted"
                  >
                    +
                  </span>
                ) : null}
                {group.map((key) => (
                  <kbd
                    key={key.label}
                    aria-label={key.aria}
                    className={`inline-grid h-7 place-items-center rounded-md border border-border-strong bg-surface-2 font-mono text-xs text-foreground ${
                      key.wide ? "min-w-20 px-2.5" : "min-w-7 px-1.5"
                    }`}
                  >
                    {key.label}
                  </kbd>
                ))}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
