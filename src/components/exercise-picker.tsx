"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { createExerciseAction } from "@/lib/actions/logs";
import { formatShortDay } from "@/lib/labels";
import { describe, type Pattern } from "@/lib/pattern";
import { NOTES_PER_BEAT } from "@/lib/records";
import {
  DEFAULT_SOUND_SETTINGS,
  type SoundSettings,
} from "@/lib/sound-settings";
import type { PickerExercise } from "@/server/exercises";
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
} from "./icons";
import { PatternPlayer } from "./pattern-player";

const normalize = (value: string) => value.trim().toLocaleLowerCase("es");

/** Miniatura de texto: un compás como mucho, y nunca más de 12 golpes. */
function miniature(pattern: Pattern) {
  const bar = 4 * NOTES_PER_BEAT[pattern.subdivision];
  return describe(pattern, Math.min(bar, 12));
}

/**
 * Selector de ejercicio: hoja que sube desde abajo en el móvil y diálogo
 * centrado en escritorio (sin cambiar de ruta). La lista llega ya ordenada del
 * servidor; el filtro mantiene ese orden.
 *
 * La hoja se monta en <body> con un portal: el formulario que la contiene
 * anima con transform/filter, y eso convierte a cualquier ancestro en el bloque
 * contenedor de `position: fixed`, sacando la hoja fuera de la pantalla.
 */
export function ExercisePicker({
  exercises,
  value,
  onChange,
  onCreated,
  error,
  sound = DEFAULT_SOUND_SETTINGS,
}: {
  exercises: PickerExercise[];
  value: string | undefined;
  onChange: (id: string) => void;
  onCreated: (exercise: PickerExercise) => void;
  error?: string;
  sound?: SoundSettings;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  // Ejercicio cuyo patrón se está viendo, en una hoja encima de la lista.
  const [previewId, setPreviewId] = useState<string>();
  const preview = exercises.find((e) => e.id === previewId);
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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Escape cierra primero la vista previa y luego el selector.
      if (previewId) setPreviewId(undefined);
      else setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, previewId]);

  function choose(id: string) {
    onChange(id);
    setPreviewId(undefined);
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

      {mounted
        ? createPortal(
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
                            <p className="mt-1 text-sm text-danger">
                              {createError}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <ExerciseGroup
                        title="Practicados"
                        items={practiced}
                        selectedId={value}
                        onChoose={choose}
                        onPreview={setPreviewId}
                      />
                      <ExerciseGroup
                        title={practiced.length ? "Todos" : undefined}
                        items={rest}
                        selectedId={value}
                        onChoose={choose}
                        onPreview={setPreviewId}
                      />
                      {!filtered.length && !q ? (
                        <p className="text-sm text-muted">No hay ejercicios.</p>
                      ) : null}
                    </div>
                  </motion.div>
                  <AnimatePresence>
                    {preview?.pattern ? (
                      <PatternPreview
                        key={preview.id}
                        exercise={preview}
                        pattern={preview.pattern}
                        sound={sound}
                        selected={preview.id === value}
                        onChoose={() => choose(preview.id)}
                        onClose={() => setPreviewId(undefined)}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * Vista previa del patrón: otra hoja encima de la lista, con "Elegir este"
 * abajo, al alcance del pulgar. Al cerrarse, el reproductor se desmonta y para.
 */
function PatternPreview({
  exercise,
  pattern,
  sound,
  selected,
  onChoose,
  onClose,
}: {
  exercise: PickerExercise;
  pattern: Pattern;
  sound: SoundSettings;
  selected: boolean;
  onChoose: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-end justify-center sm:items-center sm:p-6">
      <motion.button
        type="button"
        aria-label="Volver a la lista"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Patrón de ${exercise.name}`}
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-border bg-background shadow-2xl sm:max-h-[88dvh] sm:max-w-2xl sm:rounded-[28px]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong sm:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <p className="label-mono text-accent-ink">
              {exercise.custom ? "Ejercicio propio" : "Rudimento"}
            </p>
            <h2 className="font-display text-2xl leading-tight text-balance">
              {exercise.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
          <PatternPlayer pattern={pattern} sound={sound} />
          {exercise.custom ? (
            <Link
              href={`/ejercicios/${exercise.id}/patron`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink"
            >
              <PencilIcon size={16} /> Editar patrón
            </Link>
          ) : null}
        </div>
        <div className="border-t border-border p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <button
            type="button"
            onClick={onChoose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-12px_var(--accent)] transition-transform active:scale-[0.98]"
          >
            {selected ? <CheckIcon size={18} /> : null}
            {selected ? "Seguir con este" : "Elegir este"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ExerciseGroup({
  title,
  items,
  selectedId,
  onChoose,
  onPreview,
}: {
  title?: string;
  items: PickerExercise[];
  selectedId: string | undefined;
  onChoose: (id: string) => void;
  onPreview: (id: string) => void;
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
              <div
                className={`flex items-center gap-1 rounded-xl pr-1 transition-colors ${
                  selected ? "bg-accent/10" : "hover:bg-surface-2"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onChoose(exercise.id)}
                  aria-current={selected || undefined}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl py-3 pl-3.5 text-left"
                >
                  <span className="min-w-0">
                    <span
                      className={`block truncate ${selected ? "font-semibold text-foreground" : ""}`}
                    >
                      {exercise.name}
                    </span>
                    {exercise.pattern ? (
                      <span className="block truncate font-mono text-xs text-muted">
                        {miniature(exercise.pattern)}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
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
                {exercise.pattern ? (
                  <button
                    type="button"
                    onClick={() => onPreview(exercise.id)}
                    aria-label={`Ver y escuchar ${exercise.name}`}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-[color,background-color,transform] hover:bg-surface hover:text-accent-ink active:scale-90"
                  >
                    <EyeIcon size={20} />
                  </button>
                ) : exercise.custom ? (
                  <Link
                    href={`/ejercicios/${exercise.id}/patron`}
                    aria-label={`Dibujar el patrón de ${exercise.name}`}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-muted transition-[color,background-color] hover:bg-surface hover:text-accent-ink"
                  >
                    <PencilIcon size={18} />
                  </Link>
                ) : null}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
