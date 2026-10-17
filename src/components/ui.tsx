import type {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
} from "react";

/*
 * Escala de radios: 8 (chips), 12 (controles) y 20 (tarjetas). Elevación en
 * tres niveles: borde (tarjeta), borde + sombra corta (flotante) y panel oscuro.
 */

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-base outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 hover:border-border-strong focus:border-accent focus:ring-4 focus:ring-accent/20";

const pressable =
  "transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

/** Enlaces y botones: una sola acción principal por vista. */
export const buttonClass = {
  primary: `inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_10px_30px_-12px_var(--accent)] hover:brightness-105 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_14px_34px_-10px_var(--accent)] ${pressable}`,
  secondary: `inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium hover:border-foreground/40 ${pressable}`,
  ghost: `inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground ${pressable}`,
  danger: `inline-flex items-center justify-center gap-2 rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10 ${pressable}`,
} as const;

/** Alias histórico: los enlaces con forma de botón usan las mismas clases. */
export const linkButtonClass = buttonClass;

export const cardClass = "rounded-[20px] border border-border bg-surface";

export function Field({
  label,
  htmlFor,
  errors,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  errors?: string[];
  hint?: string;
  children: ReactNode;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="label-mono block text-muted">
          {label}
        </label>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      {children}
      {errors?.length ? (
        <p id={errorId} className="animate-rise text-sm text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={`${inputClass} ${invalid ? "border-danger" : ""} ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${buttonClass.primary} w-full py-3.5 text-base ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

/** Indicador de carga para botones: tres puntos que laten a tempo. */
export function Pulse() {
  return (
    <span aria-hidden="true" className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-blink rounded-full bg-current"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

/** Cabecera de página: etiqueta, título en display y acciones a la derecha. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 lg:mb-10">
      <div className="min-w-0 space-y-2">
        {back ? <div className="animate-rise">{back}</div> : null}
        {eyebrow ? (
          <p className="label-mono animate-rise text-accent-ink">{eyebrow}</p>
        ) : null}
        <h1
          className="animate-rise font-display text-3xl leading-[1.05] text-balance sm:text-4xl lg:text-5xl"
          style={{ "--i": 1 } as CSSProperties}
        >
          {title}
        </h1>
        {description ? (
          <p
            className="animate-rise max-w-xl text-muted text-pretty"
            style={{ "--i": 2 } as CSSProperties}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className="flex animate-rise items-center gap-2"
          style={{ "--i": 2 } as CSSProperties}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/** Estilo de --i para escalonar animaciones de entrada. */
export function stagger(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

/** Estado vacío con una ilustración de regla de metrónomo. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={`${cardClass} relative animate-rise overflow-hidden border-dashed px-6 py-12 text-center`}
    >
      <div
        aria-hidden="true"
        className="bg-ticks absolute inset-x-0 top-0 h-3 text-border-strong opacity-70"
      />
      <p className="font-display text-xl">{title}</p>
      {children ? (
        <p className="mx-auto mt-2 max-w-sm text-muted text-pretty">
          {children}
        </p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
