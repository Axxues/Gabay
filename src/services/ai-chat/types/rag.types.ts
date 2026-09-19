import type { ChartSpec } from '@/services/lms/types/chart.types';

export interface RagSource {
  label: string;
  detail: string;
}

export interface TaskProgressItem {
  id: string;
  label: string;
  durationMs?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  nodeType?: string;
  depth?: number;
  parent?: string | null;
  runsCount?: number;
}

export interface ChatProgressMetadata {
  executionId?: number;
  totalDurationMs: number;
  totalTokens?: number;
  isError?: boolean;
  interruptedAtStageId?: string;
  tasks: TaskProgressItem[];
}

export interface RagResponse {
  reply: string;
  sources: RagSource[];
  sessionId: string;
  chart?: ChartSpec | null;
  execution?: ChatProgressMetadata;
}
