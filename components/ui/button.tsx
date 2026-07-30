import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

/**
 * As classes sozinhas, para aplicar num `<Link>` que precisa parecer botão.
 *
 * Envolver o `<Button>` num `<Link>` gerava `<button>` dentro de `<a>`: HTML
 * inválido, e a semântica de teclado e leitor de tela fica indefinida. Quem
 * navega usa `<a>`; quem executa ação usa `<button>`.
 */
export function buttonClasses(variant: ButtonVariant = "primary", className?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-accent text-[#0f0f14] hover:brightness-110",
    variant === "secondary" &&
      "border border-border bg-surface-raised text-foreground hover:border-accent/50",
    variant === "ghost" && "text-muted hover:bg-surface-raised hover:text-foreground",
    className,
  );
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}
