import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:pointer-events-none",
        {
          "bg-gradient-to-r from-neon-blue to-neon-cyan text-dark-900 shadow-[0_0_20px_rgba(0,212,255,0.4)] hover:shadow-neon-blue hover:from-neon-blue hover:to-neon-blue": variant === "primary",
          "border border-white/20 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-neon-blue/50 hover:text-white":
            variant === "secondary",
          "text-slate-400 hover:bg-white/5 hover:text-white": variant === "ghost",
          "bg-neon-pink/20 text-neon-pink border border-neon-pink/40 hover:bg-neon-pink/30": variant === "danger",
        },
        {
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
