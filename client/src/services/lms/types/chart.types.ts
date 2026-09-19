export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
  [key: string]: string | number | undefined;
}

export interface ChartSpec {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data: ChartDataItem[];
}
