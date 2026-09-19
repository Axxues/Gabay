import React, { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';

interface TableActionToolbarProps {
  tableRef: React.RefObject<HTMLTableElement | null>;
  tableName?: string;
}

export function cleanTitleToSlug(rawTitle: string): string {
  if (!rawTitle) return 'Report';

  return rawTitle
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[\/\\:*?"<>|#]/g, '')
    .replace(/\s*—\s*/g, '—')
    .replace(/\s*–\s*/g, '–')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join('-')
    .replace(/^[-—–]+|[-—–]+$/g, '');
}

export function getTableTitle(table: HTMLTableElement | null): string {
  if (!table) return 'Report';

  const wrapper = table.closest('[data-table-wrapper]') || table.parentElement?.parentElement;
  let curr = wrapper?.previousElementSibling;
  let headingTitle = '';
  let paragraphTitle = '';

  let count = 0;
  while (curr && count < 6) {
    const tag = curr.tagName.toUpperCase();
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tag)) {
      headingTitle = curr.textContent?.trim() || '';
      break;
    } else if ((tag === 'P' || tag === 'DIV') && !paragraphTitle) {
      const text = curr.textContent?.trim() || '';
      if (text && text.length < 90) {
        paragraphTitle = text;
      }
    }
    curr = curr.previousElementSibling;
    count++;
  }

  const rawTitle = headingTitle || paragraphTitle || '';
  const slug = cleanTitleToSlug(rawTitle);
  return slug || 'Report';
}

export function generateCsvFilename(table: HTMLTableElement | null, customTitle?: string): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  const dateStr = `${mm}-${dd}-${yyyy}`;

  const title = customTitle ? cleanTitleToSlug(customTitle) : getTableTitle(table);
  return `${dateStr}-${title}.csv`;
}

export const TableActionToolbar: React.FC<TableActionToolbarProps> = ({ tableRef, tableName }) => {
  const [copied, setCopied] = useState(false);

  const extractTableData = () => {
    const table = tableRef.current;
    if (!table) return [];
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map((tr) => {
      const cells = Array.from(tr.querySelectorAll('th, td'));
      return cells.map((cell) => cell.textContent?.trim() || '');
    });
  };

  const exportCsv = () => {
    const data = extractTableData();
    if (data.length === 0) return;

    const csvContent = data
      .map((row) =>
        row
          .map((cell) => {
            const escaped = cell.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const filename = generateCsvFilename(tableRef.current, tableName);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyTable = async () => {
    const data = extractTableData();
    if (data.length === 0) return;

    const tsvContent = data.map((row) => row.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy table to clipboard:', e);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={copyTable}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer text-muted-foreground"
        title="Copy table to clipboard as TSV"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-semibold">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Table</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={exportCsv}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-500/15 active:scale-95 cursor-pointer"
        title="Download table data as CSV spreadsheet"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Export CSV</span>
      </button>
    </div>
  );
};
