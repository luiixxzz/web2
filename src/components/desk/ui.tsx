import type { ButtonHTMLAttributes, ReactNode } from "react";

export const fieldClass =
  "h-11 w-full rounded-md border border-line bg-surface px-3 text-sm text-fg outline-none transition placeholder:text-muted focus:border-primary";

const buttonVariants = {
  primary: "border-transparent bg-primary text-primary-fg hover:bg-primary/90",
  ghost: "border-line bg-surface text-fg hover:bg-surface-2",
  danger: "border-line bg-surface text-up hover:bg-up/10",
} as const;

export function Button({
  variant = "ghost",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      type={type}
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`rounded-lg border border-line bg-surface p-4 shadow-sm ${className}`}>{children}</section>;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  step = "0.01",
  min,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  min?: string;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-semibold text-fg">{label}</span>
      <input
        id={id}
        className={fieldClass}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onWheel={(event) => event.currentTarget.blur()}
      />
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-semibold text-fg">{label}</span>
      <input
        id={id}
        className={fieldClass}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SectionIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="mb-5">
      <h2 className="font-display text-3xl text-fg">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">{children}</p>
    </header>
  );
}

export function Pill({ children, tone }: { children: ReactNode; tone: "manual" | "api" | "none" | "quiet" }) {
  const toneClass =
    tone === "manual"
      ? "bg-surface-2 text-fg"
      : tone === "api"
        ? "bg-primary/10 text-primary"
        : "bg-surface-2 text-muted";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>;
}
