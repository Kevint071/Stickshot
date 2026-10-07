import { describe, expect, test } from "vitest";
import { parseTheme, themeAttribute } from "./theme";

describe("parseTheme", () => {
  test("acepta los tres temas", () => {
    expect(parseTheme("system")).toBe("system");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  test("valores ausentes o desconocidos caen en system", () => {
    expect(parseTheme(undefined)).toBe("system");
    expect(parseTheme("sepia")).toBe("system");
  });
});

describe("themeAttribute", () => {
  test("system no fija atributo", () => {
    expect(themeAttribute("system")).toBeUndefined();
  });

  test("light y dark se fijan tal cual", () => {
    expect(themeAttribute("light")).toBe("light");
    expect(themeAttribute("dark")).toBe("dark");
  });
});
