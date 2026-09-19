import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Loader2,
  ChevronDown,
  Clock,
  Sparkles,
  Layers,
  Database,
  FileSpreadsheet,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  MinusCircle,
  Bot,
  Code2,
  Hourglass,
  Cpu,
  HardDrive,
  Radio,
} from 'lucide-react';
import type { ChatProgressMetadata, TaskProgressItem } from '@/contexts/GabayChatContext';

interface ChatProgressTimelineProps {
  isPending?: boolean;
  progress?: ChatProgressMetadata | null;
  startTime?: number;
  prompt?: string;
  sessionId?: string;
}

function getTaskIcon(label: string, nodeType?: string) {
  if (nodeType === 'webhook') return Radio;
  if (nodeType === 'code') return Code2;
  if (nodeType === 'wait') return Hourglass;
  if (nodeType === 'agent') return Bot;
  if (nodeType === 'memory') return HardDrive;
  if (nodeType === 'model') return Cpu;
  if (nodeType === 'vectorStore') return Database;
  if (nodeType === 'embeddings') return Layers;

  const l = label.toLowerCase();
  if (l.includes('webhook')) return Radio;
  if (l.includes('normalize') || l.includes('code') || l.includes('syntax') || l.includes('parsing')) return Code2;
  if (l.includes('wait') || l.includes('limit') || l.includes('clock')) return Hourglass;
  if (l.includes('agent')) return Bot;
  if (l.includes('memory') || l.includes('buffer')) return HardDrive;
  if (l.includes('openai') || l.includes('groq') || l.includes('model')) return Cpu;
  if (l.includes('vector') || l.includes('rag') || l.includes('database') || l.includes('records') || l.includes('catalog'))
    return Database;
  if (l.includes('embedding')) return Layers;
  if (l.includes('report') || l.includes('analytics') || l.includes('synthesizing')) return FileSpreadsheet;
  if (l.includes('scope') || l.includes('boundaries') || l.includes('evaluating')) return ShieldCheck;
  if (l.includes('academic') || l.includes('curriculum')) return BookOpen;
  return Sparkles;
}

function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null || ms === 0) return '0.0s';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const ChatProgressTimeline: React.FC<ChatProgressTimelineProps> = ({
  isPending = false,
  progress,
  startTime: propStartTime,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Initialize elapsedMs directly from propStartTime so it never resets to 0 on page navigation
  const [elapsedMs, setElapsedMs] = useState<number>(() => {
    if (propStartTime && propStartTime > 0) {
      return Math.max(Date.now() - propStartTime, 0);
    }
    return 0;
  });

  const mountTimeRef = useRef<number>(
    propStartTime && propStartTime > 0 ? propStartTime : Date.now()
  );

  // Keep mountTimeRef and elapsedMs in sync if propStartTime changes or re-mounts
  useEffect(() => {
    if (propStartTime && propStartTime > 0) {
      mountTimeRef.current = propStartTime;
      setElapsedMs(Math.max(Date.now() - propStartTime, 0));
    }
  }, [propStartTime]);

  // Live timer while pending
  useEffect(() => {
    if (!isPending) return;
    const getStart = () => (propStartTime && propStartTime > 0 ? propStartTime : mountTimeRef.current);

    // Immediate sync on effect trigger
    setElapsedMs(Math.max(Date.now() - getStart(), 0));

    const interval = setInterval(() => {
      setElapsedMs(Math.max(Date.now() - getStart(), 0));
    }, 100);
    return () => clearInterval(interval);
  }, [isPending, propStartTime]);

  // LIVE PENDING STATE: Show only the spinner and seconds
  if (isPending) {
    const formattedSeconds = (elapsedMs / 1000).toFixed(1);

    return (
      <div className="my-2 inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3.5 py-1.5 shadow-subtle backdrop-blur-sm transition-all animate-in fade-in-50 duration-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground">
          GABAY is thinking…
        </span>
        <span className="flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10.5px] font-bold font-mono text-foreground">
          <Clock className="h-3 w-3 text-primary animate-pulse" />
          {formattedSeconds}s
        </span>
      </div>
    );
  }

  // COMPLETED OR INTERRUPTED STATE (COLLAPSIBLE ACCORDION) - ONLY SHOWN AFTER PROCESS
  if (!progress || !progress.tasks || progress.tasks.length === 0) {
    return null;
  }

  const isError = Boolean(progress.isError || progress.tasks.some((t) => t.status === 'failed'));
  const totalSec = (progress.totalDurationMs / 1000).toFixed(1);
  const tokensText = progress.totalTokens
    ? ` | ${progress.totalTokens.toLocaleString()} Tokens`
    : '';

  const pillStyle = isError
    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/20'
    : 'border-border/80 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground';

  const pillText = isError
    ? `Execution interrupted after ${totalSec}s`
    : `Success in ${totalSec}s${tokensText}`;

  const pillSubtext = isError
    ? '(Stopped at Coordinator Agent)'
    : `(${progress.tasks.length} tasks)`;

  return (
    <div className="my-2.5">
      {/* Collapsible Trigger Pill (Defaults to Collapsed) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className={`group inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-subtle ${pillStyle}`}
      >
        {isError ? (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        )}
        <span>{pillText}</span>
        <span className="text-[10.5px] opacity-80">{pillSubtext}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ml-0.5 ${
            isExpanded ? 'rotate-180 text-foreground' : 'text-muted-foreground'
          }`}
        />
      </button>

      {/* Expanded Task Timeline Accordion Content */}
      {isExpanded && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card/80 p-3.5 shadow-soft backdrop-blur-md animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <div className="mb-2.5 flex items-center justify-between border-b border-border/70 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Task Execution Timeline
            </span>
            {isError ? (
              <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-extrabold font-mono text-amber-600 dark:text-amber-400">
                Interrupted: {totalSec}s
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10.5px] font-extrabold font-mono text-emerald-500">
                Total: {totalSec}s{tokensText}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {progress.tasks.map((task: TaskProgressItem, idx: number) => {
              const isTaskFailed = task.status === 'failed';
              const isTaskCancelled = task.status === 'cancelled';
              const taskSec = formatDuration(task.durationMs);
              const depth = task.depth ?? 0;
              const pct = isTaskCancelled
                ? 0
                : progress.totalDurationMs > 0 && task.durationMs
                ? Math.min(Math.round((task.durationMs / progress.totalDurationMs) * 100), 100)
                : task.durationMs && task.durationMs > 0
                ? 1
                : 0;
              const Icon = getTaskIcon(task.label, task.nodeType);

              const depthPadding =
                depth === 0
                  ? ''
                  : depth === 1
                  ? 'ml-3 sm:ml-4 border-l-2 border-primary/20 pl-2'
                  : 'ml-6 sm:ml-8 border-l-2 border-primary/30 pl-2';

              return (
                <div key={task.id || idx} className={`${depthPadding}`}>
                  <div
                    className={`rounded-xl border p-2 transition-colors ${
                      isTaskFailed
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : isTaskCancelled
                        ? 'border-border/30 bg-muted/10 opacity-60'
                        : depth > 0
                        ? 'border-border/40 bg-muted/15'
                        : 'border-border/60 bg-muted/25'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {isTaskFailed ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        ) : isTaskCancelled ? (
                          <MinusCircle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                        <Icon
                          className={`h-3.5 w-3.5 shrink-0 ${
                            depth > 0 ? 'text-primary/70' : 'text-muted-foreground'
                          }`}
                        />
                        <span
                          className={`truncate ${
                            isTaskFailed
                              ? 'font-bold text-foreground'
                              : isTaskCancelled
                              ? 'font-normal text-muted-foreground line-through decoration-muted-foreground/40'
                              : depth === 0
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground/90'
                          }`}
                        >
                          {task.label}
                        </span>
                        {task.runsCount && task.runsCount > 1 && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-mono text-primary font-semibold">
                            x{task.runsCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isTaskFailed && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300">
                            Stopped at Coordinator
                          </span>
                        )}
                        {isTaskCancelled && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-medium text-muted-foreground">
                            Not reached
                          </span>
                        )}
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            isTaskFailed
                              ? 'text-amber-600 dark:text-amber-400'
                              : isTaskCancelled
                              ? 'text-muted-foreground/60'
                              : 'text-foreground'
                          }`}
                        >
                          {taskSec}
                        </span>
                      </div>
                    </div>

                    {/* Proportional Duration Bar */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/70">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isTaskFailed
                              ? 'bg-amber-500'
                              : isTaskCancelled
                              ? 'bg-transparent'
                              : depth > 0
                              ? 'bg-primary/50'
                              : 'bg-primary/75'
                          }`}
                          style={{
                            width: `${Math.max(pct, task.durationMs && task.durationMs > 0 ? 2 : 0)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono w-8 text-right shrink-0">
                        {pct}%
                      </span>
                    </div>

                    {/* Task Error Note if available */}
                    {task.error && (
                      <div className="mt-1.5 flex items-start gap-1 rounded bg-background/60 px-2 py-1 text-[10.5px] text-amber-700 dark:text-amber-300 font-mono">
                        <span className="font-semibold shrink-0">Error:</span>
                        <span className="truncate">{task.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
