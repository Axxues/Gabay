import type { ChartSpec } from '@/services/lms/types/chart.types';

export interface RagSource {
  label: string;
  detail: string;
}

export type ChatProgressMetadata = {
  stage: string;
  message: string;
  progress: number;
};

export interface RagResponse {
  reply: string;
  sources: RagSource[];
  sessionId: string;
  chart?: ChartSpec | null;
  execution?: ChatProgressMetadata;
}
