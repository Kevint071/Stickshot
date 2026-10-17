"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { tierLabel } from "@/lib/labels";
import type { Tier } from "@/lib/records";

/** Pestañas de tramo; la marca de la elegida se desliza al cambiar. */
export function TierTabs({
  exerciseId,
  tiers,
  current,
}: {
  exerciseId: string;
  tiers: Tier[];
  current: Tier;
}) {
  return (
    <nav
      aria-label="Tramo"
      className="inline-flex flex-wrap gap-1 rounded-2xl border border-border bg-surface-2/60 p-1"
    >
      {tiers.map((tier) => {
        const active = tier === current;
        return (
          <Link
            key={tier}
            href={`/ejercicios/${exerciseId}?tramo=${tier}`}
            replace
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-xl px-3.5 py-2 text-sm transition-colors ${
              active
                ? "font-semibold text-accent-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {active ? (
              <motion.span
                layoutId="tier-thumb"
                transition={{ type: "spring", stiffness: 600, damping: 40 }}
                className="absolute inset-0 rounded-xl bg-accent"
              />
            ) : null}
            <span className="relative">{tierLabel(tier)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
