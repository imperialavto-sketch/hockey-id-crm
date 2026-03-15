import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

const iconColors: Record<string, string> = {
  "школы": "text-neon-blue",
  "команды": "text-neon-pink",
  "игроки": "text-neon-green",
  "тренеры": "text-neon-cyan",
  "тренировки": "text-neon-purple",
};

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  const colorClass = iconColors[title.toLowerCase()] ?? "text-neon-blue";
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-neon-blue hover:border-neon-blue/40",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-display font-bold text-white">
            {value}
          </p>
          {trend && (
            <p className="mt-1 text-xs text-neon-green">{trend}</p>
          )}
        </div>
        <div className={cn("rounded-xl bg-white/5 p-2.5 border border-white/10", colorClass)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
