// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatProgressTimeline } from './ChatProgressTimeline';
import type { ChatProgressMetadata } from '@/contexts/GabayChatContext';

describe('ChatProgressTimeline', () => {
  it('shows only the live seconds and thinking spinner during process', () => {
    render(<ChatProgressTimeline isPending={true} startTime={Date.now()} />);

    // Live thinking indicator and seconds must be visible
    expect(screen.getByText(/GABAY is thinking/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.\ds/)).toBeInTheDocument();

    // Must NOT show task execution timeline or stage details during process
    expect(screen.queryByText('Task Execution Timeline')).not.toBeInTheDocument();
    expect(screen.queryByText(/Fetching documents from vector database/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Dispatching sub-agent tasks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Synthesizing report & compiling analytics/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gabay Webhook/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Normalize Input/i)).not.toBeInTheDocument();
  });

  it('preserves elapsed seconds when re-mounted with an existing startTime', () => {
    const twentySecondsAgo = Date.now() - 20000;
    render(
      <ChatProgressTimeline
        isPending={true}
        startTime={twentySecondsAgo}
      />
    );
    expect(screen.getByText(/20\.[0-9]s/)).toBeInTheDocument();
    expect(screen.getByText(/GABAY is thinking/i)).toBeInTheDocument();
  });

  it('renders completed state collapsed by default, and expands/collapses on click', () => {
    const mockProgress: ChatProgressMetadata = {
      totalDurationMs: 9100,
      tasks: [
        { id: 'oos1', label: 'Coordinator Agent: Evaluating query domain & scope', durationMs: 4500, status: 'completed' },
        { id: 'oos2', label: 'Coordinator Agent: Verifying school system boundaries & preparing guidance', durationMs: 4600, status: 'completed' },
      ],
    };

    render(<ChatProgressTimeline isPending={false} progress={mockProgress} />);

    const trigger = screen.getByRole('button', { name: /(Process completed|Success in) 9\.1s/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    expect(screen.queryByText('Task Execution Timeline')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Task Execution Timeline')).toBeInTheDocument();
    expect(screen.getByText('Total: 9.1s')).toBeInTheDocument();
    expect(screen.getByText('Coordinator Agent: Evaluating query domain & scope')).toBeInTheDocument();
    expect(screen.getByText('Coordinator Agent: Verifying school system boundaries & preparing guidance')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Task Execution Timeline')).not.toBeInTheDocument();
  });

  it('renders authentic n8n execution telemetry with tokens, millisecond precision, and tree hierarchy', () => {
    const mockN8nTelemetry: ChatProgressMetadata = {
      executionId: 155,
      totalDurationMs: 43719,
      totalTokens: 9817,
      tasks: [
        { id: 't0', label: 'Gabay Webhook', durationMs: 0, status: 'completed', nodeType: 'webhook', depth: 0 },
        { id: 't1', label: 'Normalize Input', durationMs: 11, status: 'completed', nodeType: 'code', depth: 0 },
        { id: 't2', label: 'Rate Limit Wait', durationMs: 1001, status: 'completed', nodeType: 'wait', depth: 0 },
        { id: 't3', label: 'Coordinator_Agent', durationMs: 43719, status: 'completed', nodeType: 'agent', depth: 0 },
        { id: 't4', label: 'Simple Memory', durationMs: 0, status: 'completed', nodeType: 'memory', depth: 1 },
        { id: 't5', label: 'OpenAI Chat Model', durationMs: 6442, status: 'completed', nodeType: 'model', depth: 1 },
        { id: 't6', label: 'Academic_Agent', durationMs: 33744, status: 'completed', nodeType: 'agent', depth: 1 },
        { id: 't7', label: 'RAG: Academic Entities', durationMs: 400, status: 'completed', nodeType: 'vectorStore', depth: 2, runsCount: 3 },
      ],
    };

    render(<ChatProgressTimeline isPending={false} progress={mockN8nTelemetry} />);

    // Header pill displays authentic tokens and duration matching n8n UI
    const trigger = screen.getByRole('button', { name: /Success in 43.7s \| 9,817 Tokens/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);

    // Verify tasks rendered
    expect(screen.getByText('Gabay Webhook')).toBeInTheDocument();
    expect(screen.getByText('Normalize Input')).toBeInTheDocument();
    expect(screen.getByText('Rate Limit Wait')).toBeInTheDocument();
    expect(screen.getByText('Coordinator_Agent')).toBeInTheDocument();
    expect(screen.getByText('Simple Memory')).toBeInTheDocument();
    expect(screen.getByText('Academic_Agent')).toBeInTheDocument();

    // Verify sub-second millisecond formatting vs second formatting
    expect(screen.getByText('11ms')).toBeInTheDocument();
    expect(screen.getByText('400ms')).toBeInTheDocument();
    expect(screen.getByText('1.0s')).toBeInTheDocument();
    expect(screen.getByText('33.7s')).toBeInTheDocument();

    // Verify runs count indicator
    expect(screen.getByText('x3')).toBeInTheDocument();
  });

  it('renders interrupted error state accurately showing stopped at Coordinator Agent with exact duration', () => {
    const mockInterruptedProgress: ChatProgressMetadata = {
      totalDurationMs: 17600,
      isError: true,
      interruptedAtStageId: 'coord_eval',
      tasks: [
        {
          id: 'coord_eval',
          label: 'Coordinator Agent: Evaluating query & determining task routing',
          durationMs: 17600,
          status: 'failed',
          error: 'RAG upstream failed (500): {"message":"Error in workflow"}',
        },
        {
          id: 'dispatch',
          label: 'Dispatching sub-agent tasks',
          durationMs: 0,
          status: 'cancelled',
        },
        {
          id: 'vector_fetch',
          label: 'Fetching documents from vector database',
          durationMs: 0,
          status: 'cancelled',
        },
        {
          id: 'synthesis',
          label: 'Synthesizing report & compiling analytics',
          durationMs: 0,
          status: 'cancelled',
        },
      ],
    };

    render(<ChatProgressTimeline isPending={false} progress={mockInterruptedProgress} />);

    // Pill must NOT claim "Process completed"
    expect(screen.queryByText(/Process completed/i)).not.toBeInTheDocument();

    // Pill must indicate execution interrupted after 17.6s and stopped at Coordinator Agent
    const trigger = screen.getByRole('button', { name: /interrupted after 17.6s/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent(/Stopped at Coordinator Agent/i);

    // Expand to inspect timeline breakdown
    fireEvent.click(trigger);

    expect(screen.getByText('Task Execution Timeline')).toBeInTheDocument();
    expect(screen.getByText(/Interrupted: 17.6s/i)).toBeInTheDocument();

    // Coordinator Agent task has the full 17.6s (100%)
    expect(screen.getByText('Coordinator Agent: Evaluating query & determining task routing')).toBeInTheDocument();
    expect(screen.getByText('17.6s')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getAllByText(/Stopped at Coordinator/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/RAG upstream failed \(500\)/i)).toBeInTheDocument();

    // Downstream tasks are NOT completed and show 0.0s with Not Reached / Cancelled
    expect(screen.getByText('Dispatching sub-agent tasks')).toBeInTheDocument();
    expect(screen.getAllByText('Not reached').length).toBe(3);
    expect(screen.getAllByText('0.0s').length).toBe(3);
    expect(screen.getAllByText('0%').length).toBe(3);
  });
});
