import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface EchogramNode {
  id: number;
  parent_id: number | null;
  prompt_text: string;
  label: string;
  score: number | null;
  mutation_type: string;
  mutation_detail: string;
  step_index: number;
}

export interface EchogramEdge {
  source: number;
  target: number;
}

interface EchogramVisualizationProps {
  nodes: EchogramNode[];
  edges: EchogramEdge[];
  pathNodeIds: number[];
  foundBypass: boolean;
  reason: string;
  bestModifiedPrompt: string | null;
  triggerPhrases: string[];
}

type PositionedNode = EchogramNode & { x: number; y: number };

function truncatePrompt(text: string, max = 90): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "only", "into", "step",
  "then", "than", "your", "you", "are", "was", "were", "have", "has", "had",
  "how", "what", "when", "where", "why", "can", "will", "would", "could", "should",
  "about", "into", "onto", "without", "being", "detected", "prompt", "token",
  "text", "mode", "analysis", "following", "instructions", "summary", "translate",
  "wrapped", "code", "block", "quotes", "context", "append", "prefix", "suffix",
]);

function extractTokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) || [])
    .filter((t) => !STOPWORDS.has(t));
}

export function EchogramVisualization({
  nodes,
  edges,
  pathNodeIds,
  foundBypass,
  reason,
  bestModifiedPrompt,
  triggerPhrases,
}: EchogramVisualizationProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const selectedNode =
    nodes.find((n) => n.id === selectedNodeId) ??
    (nodes.length > 0 ? nodes[0] : null);

  const { positioned, maxStep, maxLane } = useMemo(() => {
    const byStep = new Map<number, EchogramNode[]>();
    for (const node of nodes) {
      const step = Number.isFinite(node.step_index) ? node.step_index : 0;
      if (!byStep.has(step)) byStep.set(step, []);
      byStep.get(step)?.push(node);
    }

    let localMaxLane = 1;
    let localMaxStep = 0;
    const points: PositionedNode[] = [];
    const sortedSteps = [...byStep.keys()].sort((a, b) => a - b);

    for (const step of sortedSteps) {
      const lane = byStep.get(step) ?? [];
      lane.sort((a, b) => a.id - b.id);
      localMaxLane = Math.max(localMaxLane, lane.length);
      localMaxStep = Math.max(localMaxStep, step);
      lane.forEach((node, idx) => {
        points.push({
          ...node,
          x: step,
          y: idx,
        });
      });
    }

    return { positioned: points, maxStep: localMaxStep, maxLane: localMaxLane };
  }, [nodes]);

  const nodeLookup = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);
  const edgeLines = useMemo(
    () =>
      edges
        .map((edge) => {
          const s = nodeLookup.get(edge.source);
          const t = nodeLookup.get(edge.target);
          if (!s || !t) return null;
          return { s, t };
        })
        .filter((x): x is { s: PositionedNode; t: PositionedNode } => Boolean(x)),
    [edges, nodeLookup]
  );

  const scoreSeries = useMemo(
    () =>
      [...nodes]
        .sort((a, b) => a.step_index - b.step_index || a.id - b.id)
        .map((n, idx) => ({
          id: n.id,
          attempt: idx + 1,
          step: n.step_index,
          score: n.score ?? 0,
          label: n.label,
        })),
    [nodes]
  );

  const pathNodes = useMemo(() => {
    const index = new Map(nodes.map((n) => [n.id, n]));
    return pathNodeIds
      .map((id) => index.get(id))
      .filter((n): n is EchogramNode => Boolean(n));
  }, [nodes, pathNodeIds]);

  const wordCloud = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const scores = new Map<string, number>();

    for (let i = 1; i < pathNodeIds.length; i += 1) {
      const prev = byId.get(pathNodeIds[i - 1]);
      const curr = byId.get(pathNodeIds[i]);
      if (!prev || !curr) continue;

      const prevScore = prev.score ?? 0;
      const currScore = curr.score ?? prevScore;
      const improvement = Math.max(0, prevScore - currScore);
      const flipBoost = prev.label === "unsafe" && curr.label === "safe" ? 0.45 : 0;
      const weight = 1 + improvement * 8 + flipBoost;

      const source = `${curr.mutation_detail} ${curr.prompt_text}`;
      for (const token of extractTokens(source)) {
        scores.set(token, (scores.get(token) || 0) + weight);
      }
    }

    const ranked = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24);

    if (!ranked.length) return [];
    const max = ranked[0][1];
    const min = ranked[ranked.length - 1][1];
    const spread = Math.max(0.001, max - min);

    return ranked.map(([word, value]) => {
      const norm = (value - min) / spread;
      return {
        word,
        value,
        size: 12 + norm * 22,
        opacity: 0.45 + norm * 0.55,
      };
    });
  }, [nodes, pathNodeIds]);

  const totalUnsafe = nodes.filter((n) => n.label === "unsafe").length;
  const totalSafe = nodes.filter((n) => n.label === "safe").length;
  const width = Math.max(560, (maxStep + 1) * 145);
  const height = Math.max(220, maxLane * 70);
  const xPad = 52;
  const yPad = 30;
  const xScale = (step: number) => xPad + (step / Math.max(1, maxStep || 1)) * (width - xPad * 2);
  const yScale = (lane: number, step: number) => {
    const laneCount = positioned.filter((n) => n.step_index === step).length || 1;
    if (laneCount === 1) return height / 2;
    return yPad + (lane / (laneCount - 1)) * (height - yPad * 2);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Prompt Search Tree</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Safe: {totalSafe}</Badge>
              <Badge variant="outline">Unsafe: {totalUnsafe}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="w-full overflow-x-auto rounded-lg border border-border/50 bg-black/10">
            <svg width={width} height={height}>
              {edgeLines.map(({ s, t }, i) => (
                <line
                  key={`edge-${i}`}
                  x1={xScale(s.x)}
                  y1={yScale(s.y, s.x)}
                  x2={xScale(t.x)}
                  y2={yScale(t.y, t.x)}
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1.2"
                />
              ))}
              {positioned.map((node) => {
                const isSafe = node.label === "safe";
                const isPath = pathNodeIds.includes(node.id);
                const isSelected = selectedNode?.id === node.id;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${xScale(node.x)}, ${yScale(node.y, node.x)})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    <title>{`${node.label.toUpperCase()} | score=${(node.score ?? 0).toFixed(3)} | ${node.mutation_type}`}</title>
                    <circle
                      r={isSelected ? 13 : 10}
                      fill={isSafe ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)"}
                      stroke={isPath ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)"}
                      strokeWidth={isPath ? 2.2 : 1}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="8.5"
                      fill="#fff"
                      fontWeight={700}
                    >
                      {node.id}
                    </text>
                  </g>
                );
              })}
              <text x={12} y={16} fill="rgba(255,255,255,0.62)" fontSize={10}>
                Step 0
              </text>
              <text x={width - 58} y={16} fill="rgba(255,255,255,0.62)" fontSize={10}>
                Step {maxStep}
              </text>
            </svg>
          </div>

          {selectedNode && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Selected Node #{selectedNode.id}</span>
                <Badge variant={selectedNode.label === "safe" ? "default" : "destructive"}>
                  {selectedNode.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Step {selectedNode.step_index} | Score {(selectedNode.score ?? 0).toFixed(3)} | Mutation: {selectedNode.mutation_type}
              </p>
              <p className="text-sm leading-relaxed">{truncatePrompt(selectedNode.prompt_text, 220)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="text-sm">Flip Impact Word Cloud</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {wordCloud.length === 0 ? (
            <p className="text-sm text-muted-foreground">No high-impact tokens available for this run.</p>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/15 p-4 min-h-40 flex flex-wrap gap-x-3 gap-y-2 items-center">
              {wordCloud.map((item) => (
                <span
                  key={item.word}
                  title={`impact ${item.value.toFixed(2)}`}
                  className="font-semibold tracking-tight select-none"
                  style={{
                    fontSize: `${item.size}px`,
                    opacity: item.opacity,
                    color: "rgb(96 165 250)",
                    lineHeight: 1.05,
                  }}
                >
                  {item.word}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Larger words contributed more confidence change along the selected attack path.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="text-sm">Score Progression</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
                <XAxis dataKey="attempt" stroke="rgba(255,255,255,0.65)" />
                <YAxis domain={[0, 1]} stroke="rgba(255,255,255,0.65)" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    typeof value === "number" ? value.toFixed(3) : value,
                    name === "score" ? "score" : name,
                  ]}
                  labelFormatter={(label: string, payload: Array<{ payload?: { step?: number; id?: number } }>) => {
                    const point = payload?.[0]?.payload;
                    return `Attempt ${label} | Node #${point?.id ?? "?"} | Step ${point?.step ?? "?"}`;
                  }}
                  contentStyle={{
                    background: "rgba(10,10,10,0.92)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="rgb(56,189,248)" strokeWidth={2.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Attack Path</CardTitle>
            <Badge variant={foundBypass ? "default" : "secondary"}>
              {foundBypass ? "Bypass Found" : "No Bypass"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            {pathNodes.map((node, idx) => (
              <div key={node.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  Step {node.step_index} | Node #{node.id} | {node.mutation_type}
                </p>
                <p className="text-sm mt-1">{truncatePrompt(node.prompt_text)}</p>
                {idx < pathNodes.length - 1 && (
                  <p className="text-xs mt-2 text-primary/90">
                    mutation: {triggerPhrases[idx] || "n/a"}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Search Outcome</p>
            <p className="text-sm mt-2">Reason: {reason}</p>
            <p className="text-sm mt-1">Best Prompt: {truncatePrompt(bestModifiedPrompt || "N/A", 180)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
