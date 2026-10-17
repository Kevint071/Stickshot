import { expect, describe as group, test } from "vitest";
import { describe, MAX_STEPS } from ".";
import {
  canAdd,
  draftPattern,
  type EditorAction,
  type EditorState,
  editorReducer,
  initEditor,
} from "./editor";
import { notation } from "./rudiments";

/** El borrador como texto (o null si no tiene golpes). */
function text(state: EditorState) {
  const pattern = draftPattern(state);
  return pattern ? describe(pattern) : null;
}

function run(state: EditorState, ...actions: EditorAction[]) {
  return actions.reduce(editorReducer, state);
}

const tool = (
  hand: "R" | "L",
  dynamic: "ghost" | "normal" | "accent",
): EditorAction => ({ type: "setTool", tool: { hand, dynamic } });
const add: EditorAction = { type: "addStroke" };

group("editorReducer", () => {
  test("el ejemplo del usuario en cuatro toques: D normal, D acento, I normal, I acento", () => {
    const state = run(
      initEditor(null),
      tool("R", "normal"),
      add,
      tool("R", "accent"),
      add,
      tool("L", "normal"),
      add,
      tool("L", "accent"),
      add,
    );
    expect(text(state)).toBe("D D> I I>");
    expect(state.dirty).toBe(true);
  });

  test("añadir silencio lo pone al final", () => {
    const state = run(initEditor(null), add, { type: "addRest" });
    expect(state.steps).toEqual([{ hand: "R", dynamic: "normal" }, null]);
  });

  test("seleccionar carga el golpe en la barra y cambiarla edita solo ese paso", () => {
    const start = initEditor(notation("sixteenth", "R L R R"));
    const state = run(
      start,
      { type: "select", index: 2 },
      { type: "setTool", tool: { dynamic: "accent" } },
    );
    expect(state.tool).toMatchObject({ hand: "R", dynamic: "accent" });
    expect(text(state)).toBe("D I D> D");
  });

  test("con selección, añadir inserta detrás y selecciona lo nuevo", () => {
    const state = run(
      initEditor(notation("sixteenth", "R L R R")),
      { type: "select", index: 1 },
      tool("L", "ghost"),
      { type: "addStroke" },
    );
    expect(text(state)).toBe("D i i D  D");
    expect(state.selected).toBe(2);
  });

  test("tocar de nuevo el paso seleccionado lo deselecciona", () => {
    const state = run(
      initEditor(notation("sixteenth", "R L")),
      { type: "select", index: 0 },
      { type: "select", index: 0 },
    );
    expect(state.selected).toBeUndefined();
  });

  test("un silencio seleccionado pasa a golpe al tocar la barra", () => {
    const state = run(
      initEditor(notation("eighth", "R -")),
      { type: "select", index: 1 },
      tool("L", "accent"),
    );
    expect(text(state)).toBe("D I>");
  });

  test("adornos: se ponen y se quitan desde la barra", () => {
    const state = run(
      initEditor(null),
      { type: "setTool", tool: { ornament: "flam" } },
      add,
      { type: "setTool", tool: { ornament: undefined } },
      add,
    );
    expect(state.steps).toEqual([
      { hand: "R", dynamic: "normal", ornament: "flam" },
      { hand: "R", dynamic: "normal" },
    ]);
  });

  test("borrar quita el seleccionado y selecciona el vecino", () => {
    const state = run(
      initEditor(notation("sixteenth", "R L R")),
      { type: "select", index: 2 },
      { type: "remove" },
    );
    expect(text(state)).toBe("D I");
    expect(state.selected).toBe(1);
    const empty = run(
      initEditor(notation("eighth", "R")),
      { type: "select", index: 0 },
      { type: "remove" },
    );
    expect(empty.selected).toBeUndefined();
    expect(draftPattern(empty)).toBeNull();
  });

  test("no pasa de 64 pasos", () => {
    let state = initEditor(null);
    for (let i = 0; i < MAX_STEPS + 3; i += 1) state = run(state, add);
    expect(state.steps).toHaveLength(MAX_STEPS);
    expect(canAdd(state)).toBe(false);
  });

  test("guardar limpia la marca de cambios", () => {
    const state = run(initEditor(null), add, { type: "saved" });
    expect(state.dirty).toBe(false);
  });
});
