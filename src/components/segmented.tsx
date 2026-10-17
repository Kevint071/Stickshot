"use client";

import { motion } from "motion/react";
import { useId } from "react";

type Option<T extends string | number> = { value: T; label: string };

/**
 * Selector de una opción con botones grandes para el pulgar. Son radios nativos
 * (flechas, una parada de tabulación y lectores de pantalla gratis) con estilo
 * de botones segmentados; la marca de la opción elegida se desliza entre ellas.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns,
  wideColumns,
  error,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: number;
  /**
   * Columnas cuando el propio selector mide 24rem o más (container query, no
   * viewport: en escritorio el formulario también va en una columna estrecha).
   */
  wideColumns?: number;
  error?: string;
}) {
  const name = useId();
  const cols = columns ?? options.length;
  return (
    <fieldset className="@container min-w-0 space-y-1.5">
      <legend className="label-mono mb-1.5 text-muted">{label}</legend>
      <div
        className={`grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-1 rounded-2xl border bg-surface-2/60 p-1 @sm:grid-cols-[repeat(var(--cols-wide),minmax(0,1fr))] ${
          error ? "border-danger" : "border-border"
        }`}
        style={
          {
            "--cols": cols,
            "--cols-wide": wideColumns ?? cols,
          } as React.CSSProperties
        }
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={`relative cursor-pointer rounded-xl px-1 py-2.5 text-center text-sm transition-colors duration-200 select-none has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                checked
                  ? "font-semibold text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {checked ? (
                <motion.span
                  layoutId={`${name}-thumb`}
                  transition={{ type: "spring", stiffness: 600, damping: 40 }}
                  className="absolute inset-0 rounded-xl bg-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_6px_16px_-8px_var(--accent)]"
                />
              ) : null}
              <input
                type="radio"
                name={name}
                value={String(option.value)}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className="relative">{option.label}</span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="animate-rise text-sm text-danger">{error}</p>
      ) : null}
    </fieldset>
  );
}
