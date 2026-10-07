import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function Field({
  label,
  htmlFor,
  errors,
  children,
}: {
  label: string;
  htmlFor?: string;
  errors?: string[];
  children: ReactNode;
}) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {errors?.length ? (
        <p id={errorId} className="text-sm text-danger">
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
      className={`w-full rounded-xl bg-accent py-3 text-base font-semibold text-accent-foreground disabled:opacity-60 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
