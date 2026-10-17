"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV_ITEMS, PRACTICE_ITEM } from "./nav-items";

const spring = { type: "spring", stiffness: 520, damping: 38 } as const;

function Tab({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const active = isActive(pathname, item.href);
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors active:scale-95 ${
          active ? "text-foreground" : "text-muted"
        }`}
      >
        {active ? (
          <motion.span
            layoutId="tab-active"
            transition={spring}
            className="absolute inset-x-2 inset-y-1 rounded-xl bg-surface-2"
          />
        ) : null}
        <item.icon size={22} className="relative" />
        <span className="relative">{item.label}</span>
      </Link>
    </li>
  );
}

/**
 * Barra del móvil: una isla flotante al alcance del pulgar, con "Practicar"
 * en el centro y elevada. En escritorio la sustituye la barra lateral.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [home, history, exercises, settings] = NAV_ITEMS;
  const practicing = isActive(pathname, PRACTICE_ITEM.href);

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center rounded-[22px] border border-border bg-surface/85 px-1 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45)] backdrop-blur-xl">
        <Tab item={home} pathname={pathname} />
        <Tab item={history} pathname={pathname} />
        <li className="flex flex-1 justify-center">
          <Link
            href={PRACTICE_ITEM.href}
            aria-label={PRACTICE_ITEM.label}
            aria-current={practicing ? "page" : undefined}
            className="relative -mt-7 grid size-15 place-items-center rounded-full bg-accent text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_12px_28px_-8px_var(--accent)] ring-4 ring-background transition-transform duration-300 ease-spring active:scale-90"
          >
            {practicing ? null : (
              <span className="absolute inset-0 animate-ring rounded-full bg-accent" />
            )}
            <PRACTICE_ITEM.icon size={26} className="relative" />
          </Link>
        </li>
        <Tab item={exercises} pathname={pathname} />
        <Tab item={settings} pathname={pathname} />
      </ul>
    </nav>
  );
}
