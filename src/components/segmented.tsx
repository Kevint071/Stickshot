"use client";

import { useId } from "react";

type Option<T extends string | number> = { value: T; label: string };

/**
 * Selector de una opción con botones grandes para el pulgar. Son radios nativos
 * (flechas, una parada de tabulación y lectores de pantalla gratis) con estilo
 * de botones segmentados.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  columns,
  error,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: number;
  error?: string;
}) {
  const name = useId();
  return (
    <fieldset className="min-w-0 space-y-1">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div
        className={`grid gap-1 rounded-xl border bg-surface p-1 ${
          error ? "border-danger" : "border-border"
        }`}
        style={{
          gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
        }}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-lg px-1 py-2 text-center text-sm text-foreground has-checked:bg-accent has-checked:font-semibold has-checked:text-accent-foreground has-focus-visible:ring-2 has-focus-visible:ring-accent/50"
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </fieldset>
  );
}
