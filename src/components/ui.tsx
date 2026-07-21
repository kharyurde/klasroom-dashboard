import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

export function Logo({ size = 32, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-xl bg-brand-700 text-white shadow-soft"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-[60%] w-[60%]">
          <path d="M4 15c0-1 .8-1.7 1.8-1.8L12 10l6.2 3.2c1 .1 1.8.8 1.8 1.8v1H4v-1z" fill="#41c09e"/>
          <path d="M6 16h12v4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4z" fill="#7cdabd"/>
          <path d="M11 8a1 1 0 1 1 2 0v1h2V8a3 3 0 0 0-6 0v1h2V8z" fill="#d6f5e9"/>
        </svg>
      </div>
      {withText && (
        <div className="leading-none">
          <p className="font-display text-lg font-extrabold tracking-tight text-ink-900">Klasroom</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">by 937 Limited</p>
        </div>
      )}
    </div>
  );
}

export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  children,
  loading,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
}) {
  const cls = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
    gold: "btn-gold",
  }[variant];
  return (
    <button className={`${cls} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner className="opacity-80" />}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "ocean" | "gold" | "rose" | "ink";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-100 text-ink-700",
    brand: "bg-brand-100 text-brand-700",
    ocean: "bg-ocean-100 text-ocean-700",
    gold: "bg-gold-100 text-gold-700",
    rose: "bg-rose-100 text-rose-700",
    ink: "bg-ink-900 text-white",
  };
  return <span className={`badge ${tones[tone]} ${className}`}>{children}</span>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
      {icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-50 text-ink-400">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-ink-500 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/40 animate-fade-in" onClick={onClose} />
      <div className={`relative z-10 w-full ${w} animate-slide-up card max-h-[92vh] overflow-y-auto scrollbar-thin`}>
        {title && (
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h3 className="text-base font-semibold text-ink-900">{title}</h3>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const init = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  if (src) {
    return <img src={src} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="grid place-items-center rounded-full bg-brand-100 text-brand-700 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {init || "?"}
    </div>
  );
}