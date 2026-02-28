import { Shield, Zap, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SplashPageProps {
  onBegin: () => void;
}

export function SplashPage({ onBegin }: SplashPageProps) {
  return (
    <div className="h-screen w-screen flex items-center justify-center px-4 overflow-hidden relative z-10">
      <div className="max-w-xl w-full space-y-4 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Logo and Title */}
        <div className="space-y-2">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/40">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">
            Echo<span className="text-primary">Shield</span>
          </h1>
          <p className="text-sm text-primary font-semibold">Advanced Adversarial Security Discovery</p>
        </div>

        {/* Description */}
        <div className="glass-card p-5 md:p-6 space-y-3">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-foreground mb-1">Discover Hidden Vulnerabilities</h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  Find safety classification bypasses using adversarial search algorithms.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-accent" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-foreground mb-1">Iterative Prompt Modification</h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  Watch our AI find the smallest changes needed to bypass safety filters.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-foreground mb-1">Defense Recommendations</h3>
                <p className="text-xs text-muted-foreground leading-snug">
                  Get actionable insights to protect your models against attacks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="space-y-2">
          <Button
            onClick={onBegin}
            className="glass-button w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold text-sm gap-2 group"
          >
            Begin Security Search
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            No login required • Free to use
          </p>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10">
          <p className="text-xs text-muted-foreground">
            EchoShield v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
