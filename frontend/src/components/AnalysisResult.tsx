import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassificationBadge } from "./ClassificationBadge";
import { ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalysisResultProps {
  originalPrompt: string;
  modifiedPrompt: string;
  modificationsDescription: string;
  isNowSafe: boolean;
  reasoning: string;
  isLoading: boolean;
}

export function AnalysisResult({
  originalPrompt,
  modifiedPrompt,
  modificationsDescription,
  isNowSafe,
  reasoning,
  isLoading
}: AnalysisResultProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 opacity-60 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card/50 border-dashed"><CardContent className="h-40" /></Card>
          <Card className="bg-card/50 border-dashed"><CardContent className="h-40" /></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Original */}
        <Card className="bg-card border-border overflow-hidden relative group">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Original Prompt
              </CardTitle>
              <ClassificationBadge status="unsafe" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <pre className="font-code text-sm whitespace-pre-wrap break-words technical-scroll max-h-48 overflow-y-auto leading-relaxed text-red-100/80">
              {originalPrompt}
            </pre>
          </CardContent>
          <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-primary border-4 border-background text-primary-foreground shadow-lg">
            <ArrowRight className="w-4 h-4" />
          </div>
        </Card>

        {/* Adversarial Modification */}
        <Card className="bg-card border-primary/30 overflow-hidden relative group ring-1 ring-primary/10">
          <CardHeader className="pb-3 border-b border-border/50 bg-primary/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Adversarial Version
              </CardTitle>
              <ClassificationBadge status={isNowSafe ? "safe" : "unsafe"} />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <pre className="font-code text-sm whitespace-pre-wrap break-words technical-scroll max-h-48 overflow-y-auto leading-relaxed text-accent">
              {modifiedPrompt}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            Modification Details
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">Minimal Search Complete</Badge>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Change log</h4>
            <p className="text-sm leading-relaxed text-foreground/90 bg-muted/20 p-3 rounded-md border border-border/50">
              {modificationsDescription}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Technical Reasoning</h4>
            <p className="text-sm leading-relaxed text-muted-foreground italic">
              {reasoning}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
