import type { Subdivision } from "@/db/schema";
import {
  type Dynamic,
  MAX_STEPS,
  type Ornament,
  type Pattern,
  type PatternHand,
  type Step,
} from ".";

/** Lo que tiene puesto la barra de herramientas del editor. */
export type Tool = { hand: PatternHand; dynamic: Dynamic; ornament?: Ornament };

export type EditorState = {
  steps: Step[];
  subdivision: Subdivision;
  /** Paso seleccionado: la barra lo edita y "Añadir" inserta detrás. */
  selected?: number;
  tool: Tool;
  /** Hay cambios sin guardar. */
  dirty: boolean;
};

export type EditorAction =
  | { type: "addStroke" }
  | { type: "addRest" }
  | { type: "select"; index: number }
  | { type: "setTool"; tool: Partial<Tool> }
  | { type: "remove" }
  | { type: "setSubdivision"; subdivision: Subdivision }
  | { type: "saved" };

const DEFAULT_TOOL: Tool = { hand: "R", dynamic: "normal" };

export function initEditor(pattern: Pattern | null): EditorState {
  return {
    steps: pattern?.steps ?? [],
    subdivision: pattern?.subdivision ?? "sixteenth",
    tool: DEFAULT_TOOL,
    dirty: false,
  };
}

export function canAdd(state: EditorState) {
  return state.steps.length < MAX_STEPS;
}

function strokeOf(tool: Tool): Step {
  return tool.ornament
    ? { hand: tool.hand, dynamic: tool.dynamic, ornament: tool.ornament }
    : { hand: tool.hand, dynamic: tool.dynamic };
}

/** Inserta detrás de la selección (o al final) y selecciona lo insertado si había selección. */
function insert(state: EditorState, step: Step): EditorState {
  if (!canAdd(state)) return state;
  const at =
    state.selected === undefined ? state.steps.length : state.selected + 1;
  const steps = [...state.steps.slice(0, at), step, ...state.steps.slice(at)];
  return {
    ...state,
    steps,
    selected: state.selected === undefined ? undefined : at,
    dirty: true,
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case "addStroke":
      return insert(state, strokeOf(state.tool));
    case "addRest":
      return insert(state, null);
    case "select": {
      if (state.selected === action.index)
        return { ...state, selected: undefined };
      const step = state.steps[action.index];
      if (step === undefined) return state;
      // La barra pasa a mostrar el golpe elegido; un silencio la deja como está.
      const tool = step
        ? { hand: step.hand, dynamic: step.dynamic, ornament: step.ornament }
        : state.tool;
      return { ...state, selected: action.index, tool };
    }
    case "setTool": {
      const tool = { ...state.tool, ...action.tool };
      if (state.selected === undefined) return { ...state, tool };
      // Con un paso seleccionado, la barra lo edita (un silencio pasa a golpe).
      const steps = state.steps.map((step, i) =>
        i === state.selected ? strokeOf(tool) : step,
      );
      return { ...state, tool, steps, dirty: true };
    }
    case "remove": {
      if (state.selected === undefined) return state;
      const steps = state.steps.filter((_, i) => i !== state.selected);
      const selected = steps.length
        ? Math.min(state.selected, steps.length - 1)
        : undefined;
      return { ...state, steps, selected, dirty: true };
    }
    case "setSubdivision":
      return { ...state, subdivision: action.subdivision, dirty: true };
    case "saved":
      return { ...state, dirty: false };
  }
}

/** El borrador como patrón, o null si aún no tiene ningún golpe. */
export function draftPattern(state: EditorState): Pattern | null {
  return state.steps.some((step) => step !== null)
    ? { steps: state.steps, subdivision: state.subdivision }
    : null;
}
