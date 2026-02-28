import { useState } from "react";
import { Search, Shield, Zap, Info, ArrowRight, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adversarialPromptGenerator, type AdversarialPromptGeneratorOutput } from "@/ai/flows/adversarial-prompt-generator";
import { generateVulnerabilityInsights, type VulnerabilityInsightGeneratorOutput } from "@/ai/flows/vulnerability-insight-generator";
import { AnalysisResult } from "@/components/AnalysisResult";
import { VulnerabilityInsightsDisplay } from "@/components/VulnerabilityInsightsDisplay";
import { SafetyClassificationResult } from "@/components/SafetyClassificationResult";
import { SplashPage } from "@/components/SplashPage";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface ClassificationResult {
  label: "safe" | "unsafe";
  score: number;
  category: string;
  echo: string;
}

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [adversarialResult, setAdversarialResult] = useState<AdversarialPromptGeneratorOutput | null>(null);
  const [insightsResult, setInsightsResult] = useState<VulnerabilityInsightGeneratorOutput | null>(null);
  const [selectedGuardrail, setSelectedGuardrail] = useState("gemini-2.0-flash");
  const { toast } = useToast();

  const guardrailModels = [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "llama-2-70b", label: "Llama 2 70B" },
    { value: "mistral-large", label: "Mistral Large" },
  ];

  const resetDerivedResults = () => {
    setClassificationResult(null);
    setAdversarialResult(null);
    setInsightsResult(null);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    setIsAnalyzing(true);
    setIsClassifying(true);
    setAdversarialResult(null);
    setInsightsResult(null);

    try {
      // M2: Step 1 - Get initial safety classification
      const classifyResponse = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputPrompt })
      });

      if (!classifyResponse.ok) {
        throw new Error('Failed to classify prompt');
      }

      const classificationData: ClassificationResult = await classifyResponse.json();
      setClassificationResult(classificationData);
      setIsClassifying(false);

      // M3: Step 2 - Generate adversarial modification
      const advResult = await adversarialPromptGenerator({ initialPrompt: inputPrompt });
      setAdversarialResult(advResult);

      // Step 3 - Generate insights based on the modification
      const insightRes = await generateVulnerabilityInsights({
        originalPrompt: inputPrompt,
        modifiedPrompt: advResult.modifiedPrompt,
        originalClassification: classificationData.label,
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
      setIsClassifying(false);
    }
  };

  return (
    <>
      {!hasStarted ? (
        <SplashPage onBegin={() => setHasStarted(true)} />
      ) : (
        <>
          {/* Animated background orbs */}
          <div className="floating-orb-bg w-full h-full max-w-2xl max-h-2xl bg-gradient-to-br from-primary/40 to-transparent top-1/4 left-1/3" style={{ animation: 'floatOrb1 25s ease-in-out infinite' }} />
          <div className="floating-orb-bg w-full h-full max-w-xl max-h-xl bg-gradient-to-tr from-accent/35 to-transparent bottom-1/3 right-1/4" style={{ animation: 'floatOrb2 28s ease-in-out infinite reverse' }} />
          <div className="floating-orb-bg w-full h-full max-w-2xl max-h-2xl bg-gradient-to-br from-primary/35 via-accent/15 to-transparent top-1/2 right-1/3" style={{ animation: 'floatOrb3 30s ease-in-out infinite' }} />

          <div className="max-w-7xl mx-auto px-4 py-12 md:px-8 relative z-10">
            {/* Header section */}
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(40,190,100,0.4)]">
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
                <Card className="glass-card sticky top-8">
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
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Enter a prompt known to trigger safety filters (e.g., instructions for restricted activities)..."
                          className="glass-input min-h-[220px] font-code text-sm resize-none focus:border-primary/50 transition-colors technical-scroll p-4"
                          value={inputPrompt}
                          onChange={(e) => {
                            setInputPrompt(e.target.value);
                            resetDerivedResults();
                          }}
                        />
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guardrail Model</label>
                          <Select
                            value={selectedGuardrail}
                            onValueChange={(value) => {
                              setSelectedGuardrail(value);
                              resetDerivedResults();
                            }}
                          >
                            <SelectTrigger className="glass-input pointer-events-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {guardrailModels.map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="glass-button w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold gap-2 group"
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

                      <div className="glass-card p-3 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Our AI model will iteratively perturb your input to find the smallest possible change that flips a 'unsafe' classification to 'safe'.
                          </p>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Results Panel */}
              <div className="lg:col-span-7 space-y-8">
                {!classificationResult && !isAnalyzing ? (
                  <div className="glass-card h-full flex flex-col items-center justify-center py-20 rounded-2xl">
                    <div className="w-16 h-16 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center mb-4">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium text-foreground mb-2">Ready for Discovery</h3>
                    <p className="text-muted-foreground text-sm max-w-sm text-center">
                      Submit an initial prompt in the analysis panel to start the safety analysis process.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* M2: Safety Classification Result */}
                    <SafetyClassificationResult
                      label={classificationResult?.label || 'safe'}
                      score={classificationResult?.score || 0}
                      category={classificationResult?.category || 'unknown'}
                      isLoading={isClassifying}
                    />

                    {/* M3: Adversarial Search Results */}
                    <div className="space-y-4" style={{ marginTop: adversarialResult ? '1.5rem' : '0' }}>
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
              <div>EchoShield</div>
              <div>v1.0 - Milestone 1</div>
            </footer>
          </div>
        </>
      )}
      <Toaster />
    </>
  );
}
