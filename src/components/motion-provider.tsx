"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Las animaciones forman parte de la identidad de la app: se reproducen siempre,
 * aunque el sistema (p. ej. "Efectos de animación" de Windows) pida reducirlas.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}
