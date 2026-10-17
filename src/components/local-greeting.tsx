"use client";

import { useEffect, useState } from "react";

const dateFormat = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Saludo y fecha con la hora del dispositivo (el servidor no la conoce). */
export function LocalGreeting() {
  const [text, setText] = useState("");
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const greeting =
      hour < 6
        ? "Buenas noches"
        : hour < 13
          ? "Buenos días"
          : hour < 20
            ? "Buenas tardes"
            : "Buenas noches";
    setText(`${greeting} · ${dateFormat.format(now)}`);
  }, []);
  return <span className="inline-block min-h-4">{text || " "}</span>;
}
