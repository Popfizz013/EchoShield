import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassificationBadge } from "./ClassificationBadge";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SafetyClassificationResultProps {
  label: "safe" | "unsafe";
  score: number;
  category: string;
  isLoading: boolean;
}

export function SafetyClassificationResult({
  label,
  score,
  category,
  isLoading
}: SafetyClassificationResultProps) {
  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Safety Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSafe = label === "safe";
  const riskLevel = Math.round(score * 100);
  const riskColor = isSafe 
    ? "bg-gradient-to-r from-green-500/20 to-transparent" 
    : "bg-gradient-to-r from-red-500/20 to-transparent";

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className={`pb-3 border-b border-white/10 ${isSafe ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isSafe ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            Safety Classification
          </CardTitle>
          <ClassificationBadge status={label} />
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Risk Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Risk Score
            </span>
            <span className={`text-sm font-bold ${isSafe ? 'text-green-400' : 'text-red-400'}`}>
              {riskLevel}%
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${riskColor}`}>
            <Progress value={riskLevel} className="h-full" />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Risk Category
          </span>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground capitalize">
              {category.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Classification Info */}
        <div className={`p-3 rounded-lg ${isSafe ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
          <p className={`text-xs leading-relaxed ${isSafe ? 'text-green-200/80' : 'text-red-200/80'}`}>
            {isSafe 
              ? "This prompt passed safety classification checks and is considered safe for processing."
              : "This prompt contains content that violates safety guidelines and is flagged for review."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
