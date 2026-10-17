"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { deleteLogAction } from "@/lib/actions/logs";
import { buttonClass, Pulse } from "./ui";

export function DeleteLogButton({ logId }: { logId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {confirming ? (
        <motion.div
          key="confirm"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          className="space-y-3 rounded-[20px] border border-danger/50 bg-danger/5 p-4"
        >
          <p className="text-sm">
            ¿Borrar este registro? Los récords se recalcularán.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={buttonClass.secondary}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => deleteLogAction(logId))}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-60"
            >
              {pending ? <Pulse /> : "Sí, borrar"}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.button
          key="ask"
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setConfirming(true)}
          className={`${buttonClass.danger} w-full py-3`}
        >
          Borrar registro
        </motion.button>
      )}
    </AnimatePresence>
  );
}
