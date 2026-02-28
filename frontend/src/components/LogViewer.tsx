import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogViewerProps {
  logs: string[];
  elapsedMs?: number;
  isLoading?: boolean;
}

export function LogViewer({ logs, elapsedMs = 0, isLoading = false }: LogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!logs || logs.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/10 bg-white/5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} 
            />
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Execution Logs
              {isLoading && <Badge variant="secondary" className="animate-pulse">Running...</Badge>}
              {!isLoading && <Badge variant="outline">{logs.length} entries</Badge>}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {elapsedMs > 0 && (
              <span className="text-xs text-muted-foreground">{elapsedMs}ms</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                copyLogs();
              }}
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-4">
          <div className="font-code text-xs text-muted-foreground bg-black/20 rounded border border-white/10 p-4 overflow-auto max-h-96 space-y-1">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`leading-relaxed ${
                    log.includes('[ERROR]') 
                      ? 'text-red-400' 
                      : log.includes('[ECHOGRAM]')
                      ? 'text-blue-300'
                      : log.includes('[REQUEST]')
                      ? 'text-yellow-300'
                      : log.includes('[RESPONSE]')
                      ? 'text-green-300'
                      : 'text-white/70'
                  }`}
                >
                  <span className="text-white/50">{String(idx + 1).padStart(3, '0')} |</span> {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
