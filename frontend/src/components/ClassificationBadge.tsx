import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClassificationBadgeProps {
  status: 'safe' | 'unsafe' | 'pending';
  className?: string;
}

export function ClassificationBadge({ status, className }: ClassificationBadgeProps) {
  if (status === 'pending') {
    return (
      <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground animate-pulse", className)}>
        Analyzing...
      </div>
    );
  }

  const isSafe = status === 'safe';

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300",
        isSafe 
          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
          : "bg-red-500/10 text-red-400 border border-red-500/20",
        className
      )}
    >
      {isSafe ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
      {status}
    </div>
  );
}
