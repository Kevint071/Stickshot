"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/auth";
import { LogoutIcon } from "./icons";
import { Logo } from "./logo";
import { isActive, NAV_ITEMS, PRACTICE_ITEM } from "./nav-items";
import { buttonClass } from "./ui";

const spring = { type: "spring", stiffness: 520, damping: 40 } as const;

/** Navegación de escritorio: fija a la izquierda, con "Practicar" como acción principal. */
export function AppSidebar({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const practicing = isActive(pathname, PRACTICE_ITEM.href);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface/70 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/inicio" className="animate-fade px-2 text-lg">
        <Logo />
      </Link>

      <Link
        href={PRACTICE_ITEM.href}
        aria-current={practicing ? "page" : undefined}
        className={`${buttonClass.primary} group mt-8 w-full justify-between py-3 text-base ${
          practicing
            ? "ring-2 ring-accent/30 ring-offset-2 ring-offset-surface"
            : ""
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <PRACTICE_ITEM.icon className="transition-transform duration-300 ease-spring group-hover:-rotate-12" />
          {PRACTICE_ITEM.label}
        </span>
        <kbd className="rounded-md bg-accent-foreground/10 px-1.5 font-mono text-[10px]">
          P
        </kbd>
      </Link>

      <nav aria-label="Principal" className="mt-6">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item, i) => {
            const active = isActive(pathname, item.href);
            return (
              <li
                key={item.href}
                className="animate-rise"
                style={{ animationDelay: `${120 + i * 50}ms` }}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "font-semibold text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="sidebar-active"
                      transition={spring}
                      className="absolute inset-0 rounded-xl bg-surface-2"
                    />
                  ) : null}
                  {active ? (
                    <motion.span
                      layoutId="sidebar-led"
                      transition={spring}
                      className="absolute top-1/2 -left-4 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_var(--accent)]"
                    />
                  ) : null}
                  <item.icon className="relative transition-transform duration-300 ease-spring group-hover:scale-110" />
                  <span className="relative">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3 border-t border-border pt-4">
        {email ? (
          <p className="truncate px-3 text-xs text-muted" title={email}>
            {email}
          </p>
        ) : null}
        <form action={signOutAction}>
          <button
            type="submit"
            className={`${buttonClass.ghost} w-full justify-start`}
          >
            <LogoutIcon size={18} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
