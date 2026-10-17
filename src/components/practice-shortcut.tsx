"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Atajo de teclado: "P" abre Practicar desde cualquier pantalla (fuera de campos de texto). */
export function PracticeShortcut() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "p" || event.metaKey || event.ctrlKey)
        return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (pathname !== "/registrar") router.push("/registrar");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname]);
  return null;
}
