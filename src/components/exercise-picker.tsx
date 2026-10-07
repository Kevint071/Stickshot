"use client";

import { useState, useTransition } from "react";
import { createExerciseAction } from "@/lib/actions/logs";
import type { PickerExercise } from "@/server/exercises";
import { inputClass } from "./ui";

const normalize = (value: string) => value.trim().toLocaleLowerCase("es");

/**
 * Selector de ejercicio en una hoja a pantalla completa (sin cambiar de ruta).
 * La lista llega ya ordenada del servidor; el filtro mantiene ese orden.
 */
export function ExercisePicker({
  exercises,
  value,
  onChange,
  onCreated,
  error,
}: {
  exercises: PickerExercise[];
  value: string | undefined;
  onChange: (id: string) => void;
  onCreated: (exercise: PickerExercise) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createError, setCreateError] = useState<string>();
  const [creating, startCreate] = useTransition();
  const selected = exercises.find((e) => e.id === value);

  const q = normalize(query);
  const filtered = q
    ? exercises.filter((e) => normalize(e.name).includes(q))
    : exercises;
  const exactMatch = exercises.some((e) => normalize(e.name) === q);
  const practiced = filtered.filter((e) => e.lastPracticed);
  const rest = filtered.filter((e) => !e.lastPracticed);

  function choose(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
    setCreateError(undefined);
  }

  function create() {
    startCreate(async () => {
      const result = await createExerciseAction(query);
      if (!result.ok) {
        setCreateError(result.error);
        return;
      }
      onCreated(result.exercise);
      choose(result.exercise.id);
    });
  }

  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium">Ejercicio</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded-xl border bg-surface px-3 py-3 text-left text-base ${
          error ? "border-danger" : "border-border"
        } ${selected ? "font-semibold" : "text-muted"}`}
      >
        {selected?.name ?? "Elegir ejercicio"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Elegir ejercicio"
          className="fixed inset-0 z-50 flex flex-col bg-background"
        >
          <div className="mx-auto flex w-full max-w-md items-center gap-2 border-b border-border p-3">
            <input
              // biome-ignore lint/a11y/noAutofocus: la hoja se abre para buscar.
              autoFocus
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCreateError(undefined);
              }}
              placeholder="Buscar o crear ejercicio"
              aria-label="Buscar ejercicio"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-2 text-sm text-muted"
            >
              Cerrar
            </button>
          </div>
          <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto p-3">
            {q && !exactMatch ? (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={create}
                  disabled={creating}
                  className="w-full rounded-xl border border-dashed border-accent px-3 py-3 text-left font-medium text-accent"
                >
                  {creating ? "Creando…" : `Crear «${query.trim()}»`}
                </button>
                {createError ? (
                  <p className="mt-1 text-sm text-danger">{createError}</p>
                ) : null}
              </div>
            ) : null}
            <ExerciseGroup
              title="Practicados"
              items={practiced}
              selectedId={value}
              onChoose={choose}
            />
            <ExerciseGroup
              title={practiced.length ? "Todos" : undefined}
              items={rest}
              selectedId={value}
              onChoose={choose}
            />
            {!filtered.length && !q ? (
              <p className="text-sm text-muted">No hay ejercicios.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExerciseGroup({
  title,
  items,
  selectedId,
  onChoose,
}: {
  title?: string;
  items: PickerExercise[];
  selectedId: string | undefined;
  onChoose: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <section className="mb-4">
      {title ? (
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
      ) : null}
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {items.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onChoose(exercise.id)}
              aria-current={exercise.id === selectedId || undefined}
              className={`flex w-full items-center justify-between px-3 py-3 text-left ${
                exercise.id === selectedId ? "font-semibold text-accent" : ""
              }`}
            >
              <span>{exercise.name}</span>
              {exercise.custom ? (
                <span className="text-xs text-muted">Propio</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
