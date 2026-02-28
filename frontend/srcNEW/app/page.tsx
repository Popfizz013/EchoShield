"use client";

import { useState } from "react";
import { Search, Shield, Zap, Info, ArrowRight, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adversarialPromptGenerator, type AdversarialPromptGeneratorOutput } from "@/ai/flows/adversarial-prompt-generator";
import { generateVulnerabilityInsights, type VulnerabilityInsightGeneratorOutput } from "@/ai/flows/vulnerability-insight-generator";
import { AnalysisResult } from "@/components/AnalysisResult";
import { VulnerabilityInsightsDisplay } from "@/components/VulnerabilityInsightsDisplay";
import { useToast } from "@/hooks/use-toast";

export default function EchoShieldDashboard() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [adversarialResult, setAdversarialResult] = useState<AdversarialPromptGeneratorOutput | null>(null);
  const [insightsResult, setInsightsResult] = useState<VulnerabilityInsightGeneratorOutput | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    setIsAnalyzing(true);
    setAdversarialResult(null);
    setInsightsResult(null);

    try {
      // 1. Generate adversarial modification
      const advResult = await adversarialPromptGenerator({ initialPrompt: inputPrompt });
      setAdversarialResult(advResult);

      // 2. Generate insights based on the modification
      const insightRes = await generateVulnerabilityInsights({
        originalPrompt: inputPrompt,
        modifiedPrompt: advResult.modifiedPrompt,
        originalClassification: 'unsafe', // assumed per prompt generator instruction
        modifiedClassification: advResult.isNowSafe ? 'safe' : 'unsafe',
      });
      setInsightsResult(insightRes);

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "An error occurred while analyzing the prompt. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:px-8">
      {/* Header section */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(117,56,219,0.3)]">
              <Shield className="text-white w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">
              Echo<span className="text-primary">Shield</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-md">
            Advanced adversarial search and vulnerability discovery for LLM safety frameworks.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Status</span>
            <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Models Active
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Panel */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-card/40 border-border backdrop-blur-sm sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-accent" />
                Prompt Analysis
              </CardTitle>
              <CardDescription>
                Submit an unsafe prompt to find potential safety classification bypasses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAnalyze} className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder="Enter a prompt known to trigger safety filters (e.g., instructions for restricted activities)..."
                    className="min-h-[220px] bg-background/50 font-code text-sm resize-none border-border/50 focus:border-primary/50 transition-colors technical-scroll p-4"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 pointer-events-none opacity-50 text-[10px] text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    Auto-detection enabled
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold gap-2 group shadow-lg shadow-primary/20"
                  disabled={isAnalyzing || !inputPrompt.trim()}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Performing Adversarial Search...
                    </>
                  ) : (
                    <>
                      Execute Discovery Search
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Our AI model will iteratively perturb your input to find the smallest possible change that flips a 'unsafe' classification to 'safe'.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-7 space-y-8">
          {!adversarialResult && !isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-2">Ready for Discovery</h3>
              <p className="text-muted-foreground text-sm max-w-sm text-center">
                Submit an initial prompt in the analysis panel to start the adversarial search process.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CornerDownRight className="w-4 h-4 text-primary" />
                    Adversarial Search Results
                  </h2>
                  {adversarialResult && (
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground uppercase">
                      Analysis complete
                    </span>
                  )}
                </div>
                
                <AnalysisResult
                  originalPrompt={inputPrompt}
                  modifiedPrompt={adversarialResult?.modifiedPrompt || ""}
                  modificationsDescription={adversarialResult?.modificationsDescription || ""}
                  isNowSafe={adversarialResult?.isNowSafe || false}
                  reasoning={adversarialResult?.reasoning || ""}
                  isLoading={isAnalyzing && !adversarialResult}
                />
              </div>

              {(insightsResult || (isAnalyzing && adversarialResult)) && (
                <div className="space-y-4 border-t border-border pt-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-accent" />
                      Safety Defense Strategy
                    </h2>
                  </div>
                  
                  <VulnerabilityInsightsDisplay
                    insights={insightsResult?.vulnerabilityInsights || ""}
                    suggestions={insightsResult?.safetyDefenseSuggestions || ""}
                    isLoading={isAnalyzing && !!adversarialResult && !insightsResult}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Footer Info */}
      <footer className="mt-24 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted-foreground uppercase tracking-widest">
        <div className="flex gap-8">
          <span>&copy; 2024 EchoShield Safety Labs</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Documentation</span>
          <span className="hover:text-primary cursor-pointer transition-colors">API Access</span>
        </div>
        <div className="font-mono text-accent">
          v4.2.0-secure_alpha
        </div>
      </footer>
    </div>
  );
}
