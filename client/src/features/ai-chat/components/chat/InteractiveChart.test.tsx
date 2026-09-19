// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InteractiveChart } from './InteractiveChart';
import type { ChartSpec } from '@/services/lms/types/chart.types';

describe('InteractiveChart', () => {
  it('renders fallback when data is empty', () => {
    const emptySpec: ChartSpec = {
      type: 'bar',
      title: 'Empty Chart',
      data: [],
    };
    render(<InteractiveChart spec={emptySpec} />);
    expect(screen.getByText(/no chart data available/i)).toBeInTheDocument();
  });

  it('renders chart title and subtitle', () => {
    const spec: ChartSpec = {
      type: 'bar',
      title: 'Enrolled Students by Status',
      description: 'Breakdown of active vs continuing',
      data: [
        { label: 'Returning', value: 1 },
        { label: 'Continuing', value: 1 },
      ],
    };
    render(<InteractiveChart spec={spec} />);
    expect(screen.getByText('Enrolled Students by Status')).toBeInTheDocument();
    expect(screen.getByText('Breakdown of active vs continuing')).toBeInTheDocument();
    expect(screen.getByText('bar chart')).toBeInTheDocument();
  });
});
