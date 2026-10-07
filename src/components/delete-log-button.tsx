"use client";

import { useState, useTransition } from "react";
import { deleteLogAction } from "@/lib/actions/logs";

export function DeleteLogButton({ logId }: { logId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-xl border border-border py-3 font-medium text-danger"
      >
        Borrar registro
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-xl border border-danger p-3">
      <p className="text-sm">
        ¿Borrar este registro? Los récords se recalcularán.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-border py-2"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => deleteLogAction(logId))}
          className="rounded-lg bg-danger py-2 font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Borrando…" : "Sí, borrar"}
        </button>
      </div>
    </div>
  );
}
