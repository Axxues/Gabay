// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChatMarkdown } from './ChatMarkdown';
import { cleanTitleToSlug, generateCsvFilename } from './TableActionToolbar';

describe('ChatMarkdown', () => {
  it('renders markdown tables with headers and rows', () => {
    const tableMd = [
      '',
      '| Student Name | Student ID | Status |',
      '|---|---|---|',
      '| Edrich Josh | 23109093 | Returning |',
      '| Kurby John | 23103733 | Continuing |',
      '',
    ].join('\n');

    render(<ChatMarkdown content={tableMd} />);
    expect(screen.getByText('Student Name')).toBeInTheDocument();
    expect(screen.getByText('Edrich Josh')).toBeInTheDocument();
    expect(screen.getByText('23109093')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('renders embedded chart code fences', () => {
    const chartMd = [
      'Here is the chart:',
      '',
      '```chart',
      '{',
      '  "type": "bar",',
      '  "title": "Enrolled Breakdown",',
      '  "data": [',
      '    { "label": "Returning", "value": 1 },',
      '    { "label": "Continuing", "value": 1 }',
      '  ]',
      '}',
      '```',
    ].join('\n');

    render(<ChatMarkdown content={chartMd} />);
    expect(screen.getByText('Here is the chart:')).toBeInTheDocument();
    expect(screen.getByText('Enrolled Breakdown')).toBeInTheDocument();
  });

  it('generates dynamic CSV filenames with current date and table name', () => {
    expect(cleanTitleToSlug('📊 Student Enrollment Report — Summary Comparison')).toBe(
      'Student-Enrollment-Report—Summary-Comparison'
    );
    expect(cleanTitleToSlug('📋 Detailed Student List')).toBe('Detailed-Student-List');

    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yyyy = now.getFullYear();
    const expectedPrefix = `${mm}-${dd}-${yyyy}`;

    const filename1 = generateCsvFilename(null, '📊 Student Enrollment Report — Summary Comparison');
    expect(filename1).toBe(`${expectedPrefix}-Student-Enrollment-Report—Summary-Comparison.csv`);

    const filename2 = generateCsvFilename(null, '📋 Detailed Student List');
    expect(filename2).toBe(`${expectedPrefix}-Detailed-Student-List.csv`);
  });

  it('does NOT render duplicate charts when content already embeds the chart', () => {
    const chartSpec = {
      type: 'pie',
      title: 'Enrollment Status Distribution',
      data: [
        { label: 'Currently Enrolled', value: 3 },
        { label: 'Pending Enrollment', value: 1 },
      ],
    };
    const chartMd = [
      'Here is the distribution:',
      '',
      '\`\`\`chart',
      JSON.stringify(chartSpec, null, 2),
      '\`\`\`',
    ].join('\n').replace(/\\/g, '');

    render(<ChatMarkdown content={chartMd} attachedChart={chartSpec as any} />);
    const titleElements = screen.getAllByText('Enrollment Status Distribution');
    expect(titleElements).toHaveLength(1);
  });

  it('renders attachedChart when content does NOT embed a chart', () => {
    const chartSpec = {
      type: 'pie',
      title: 'Separate Enrollment Chart',
      data: [{ label: 'Currently Enrolled', value: 3 }],
    };
    const plainMd = 'Here is the summary without an embedded chart code block.';

    render(<ChatMarkdown content={plainMd} attachedChart={chartSpec as any} />);
    expect(screen.getByText('Separate Enrollment Chart')).toBeInTheDocument();
  });

  it('deduplicates multiple identical embedded chart blocks within content', () => {
    const chartSpec = {
      type: 'bar',
      title: 'Identical Chart Block',
      data: [{ label: 'Freshman', value: 1 }],
    };
    const doubleChartMd = [
      'First chart appearance:',
      '',
      '```chart',
      JSON.stringify(chartSpec, null, 2),
      '```',
      '',
      'Second duplicate chart appearance:',
      '',
      '```chart',
      JSON.stringify(chartSpec, null, 2),
      '```',
    ].join('\n');

    render(<ChatMarkdown content={doubleChartMd} />);
    const titleElements = screen.getAllByText('Identical Chart Block');
    expect(titleElements).toHaveLength(1);
  });

  it('renders multiple distinct charts when content embeds different chart types/titles', () => {
    const chart1 = {
      type: 'bar',
      title: 'First Distinct Chart',
      data: [{ label: 'Enrolled', value: 3 }],
    };
    const chart2 = {
      type: 'pie',
      title: 'Second Distinct Chart',
      data: [{ label: 'Pending', value: 1 }],
    };
    const distinctChartsMd = [
      '```chart',
      JSON.stringify(chart1, null, 2),
      '```',
      '',
      '```chart',
      JSON.stringify(chart2, null, 2),
      '```',
    ].join('\n');

    render(<ChatMarkdown content={distinctChartsMd} />);
    expect(screen.getByText('First Distinct Chart')).toBeInTheDocument();
    expect(screen.getByText('Second Distinct Chart')).toBeInTheDocument();
  });
});
