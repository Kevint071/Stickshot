"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useTransition } from "react";
import { createExerciseAction } from "@/lib/actions/logs";
import { formatShortDay } from "@/lib/labels";
import type { PickerExercise } from "@/server/exercises";
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
} from "./icons";

const normalize = (value: string) => value.trim().toLocaleLowerCase("es");

/**
 * Selector de ejercicio: hoja que sube desde abajo en el móvil y diálogo
 * centrado en escritorio (sin cambiar de ruta). La lista llega ya ordenada del
 * servidor; el filtro mantiene ese orden.
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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

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
    <div className="space-y-1.5">
      <span className="label-mono block text-muted">Ejercicio</span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group flex w-full items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-4 text-left transition-[border-color,transform] duration-200 hover:border-border-strong active:scale-[0.99] ${
          error ? "border-danger" : "border-border"
        }`}
      >
        <span className="min-w-0">
          <span
            className={`block truncate text-lg ${selected ? "font-display" : "text-muted"}`}
          >
            {selected?.name ?? "Elegir ejercicio"}
          </span>
          {selected?.lastPracticed ? (
            <span className="text-xs text-muted">
              Última vez el {formatShortDay(selected.lastPracticed)}
            </span>
          ) : null}
        </span>
        <ChevronRightIcon className="shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1" />
      </button>
      {error ? (
        <p className="animate-rise text-sm text-danger">{error}</p>
      ) : null}

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
            <motion.button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Elegir ejercicio"
              initial={{ y: "100%", opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-border bg-background shadow-2xl sm:max-h-[80dvh] sm:max-w-lg sm:rounded-[28px]"
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong sm:hidden" />
              <div className="flex items-center gap-2 border-b border-border p-4">
                <div className="relative flex-1">
                  <SearchIcon
                    size={18}
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
                  />
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
                    className="w-full rounded-xl border border-border bg-surface py-3 pr-3 pl-10 text-base outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
                {q && !exactMatch ? (
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={create}
                      disabled={creating}
                      className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent/70 px-4 py-3.5 text-left font-medium text-accent-ink transition-colors hover:bg-accent/10"
                    >
                      <PlusIcon size={18} />
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
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
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
    <section className="mb-5">
      {title ? <h2 className="label-mono mb-2 text-muted">{title}</h2> : null}
      <ul className="space-y-1">
        {items.map((exercise, i) => {
          const selected = exercise.id === selectedId;
          return (
            <motion.li
              key={exercise.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 12) * 0.02 }}
            >
              <button
                type="button"
                onClick={() => onChoose(exercise.id)}
                aria-current={selected || undefined}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
                  selected
                    ? "bg-accent/10 font-semibold text-foreground"
                    : "hover:bg-surface-2"
                }`}
              >
                <span>{exercise.name}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {exercise.custom ? (
                    <span className="rounded-md border border-border px-1.5 py-0.5">
                      Propio
                    </span>
                  ) : null}
                  {selected ? (
                    <CheckIcon size={18} className="text-accent-ink" />
                  ) : null}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
