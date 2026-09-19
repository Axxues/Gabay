import React, { useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChartSpec } from '@/services/lms/types/chart.types';
import { InteractiveChart } from './InteractiveChart';
import { TableActionToolbar } from './TableActionToolbar';

interface ChatMarkdownProps {
  content: string;
  attachedChart?: ChartSpec | null;
}

export function getChartSignature(spec: unknown): string {
  if (!spec || typeof spec !== 'object') return '';
  const c = spec as Partial<ChartSpec>;
  const title = (c.title || '').trim().toLowerCase();
  const type = (c.type || '').trim().toLowerCase();
  const dataKey = Array.isArray(c.data)
    ? c.data
        .map((d) => `${(d.label || '').trim().toLowerCase()}:${d.value}`)
        .sort()
        .join('|')
    : '';
  return `${type}::${title}::${dataKey}`;
}

export function hasMatchingEmbeddedChart(markdown: string, attachedSpec?: ChartSpec | null): boolean {
  if (!markdown || typeof markdown !== 'string') return false;

  const codeBlockRegex = /```(?:chart|json)?\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null;
  let anyChartFound = false;
  const targetSig = attachedSpec ? getChartSignature(attachedSpec) : null;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const raw = match[1].trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.type === 'string' &&
          Array.isArray(parsed.data) &&
          parsed.data.length > 0
        ) {
          anyChartFound = true;
          if (targetSig) {
            if (getChartSignature(parsed) === targetSig) {
              return true;
            }
          } else {
            return true;
          }
        }
      } catch {
        // ignore non-json
      }
    }
  }

  return anyChartFound;
}

export function deduplicateChartBlocks(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') return markdown;

  const seenSignatures = new Set<string>();
  const codeBlockRegex = /```(?:chart|json)?\s*([\s\S]*?)\s*```/gi;

  return markdown.replace(codeBlockRegex, (match, codeText) => {
    const trimmed = codeText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.type === 'string' &&
          Array.isArray(parsed.data) &&
          parsed.data.length > 0
        ) {
          const sig = getChartSignature(parsed);
          if (seenSignatures.has(sig)) {
            return '';
          }
          seenSignatures.add(sig);
        }
      } catch {
        // keep match
      }
    }
    return match;
  });
}

const TableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tableRef = useRef<HTMLTableElement | null>(null);

  return (
    <div data-table-wrapper className="my-3 overflow-hidden rounded-xl border border-border bg-card">
      <div className="max-h-96 overflow-x-auto">
        <table ref={tableRef} className="w-full text-left text-xs text-foreground">
          {children}
        </table>
      </div>
      <TableActionToolbar tableRef={tableRef} />
    </div>
  );
};

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content, attachedChart }) => {
  // Deduplicate identical chart blocks purely before parsing
  const sanitizedContent = useMemo(() => deduplicateChartBlocks(content), [content]);

  // Determine if chart was already embedded in the markdown stream
  const hasEmbedded = useMemo(
    () => hasMatchingEmbeddedChart(sanitizedContent, attachedChart),
    [sanitizedContent, attachedChart]
  );

  return (
    <div className="prose prose-sm max-w-none space-y-2 leading-relaxed text-foreground dark:prose-invert prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary [&_strong]:text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table({ children }) {
            return <TableWrapper>{children}</TableWrapper>;
          },
          thead({ children }) {
            return (
              <thead className="border-b border-border bg-muted font-semibold text-muted-foreground">
                {children}
              </thead>
            );
          },
          th({ children }) {
            return <th className="px-3.5 py-2.5">{children}</th>;
          },
          td({ children }) {
            return (
              <td className="border-b border-border/60 px-3.5 py-2 transition-colors hover:bg-muted/50">
                {children}
              </td>
            );
          },
          h1({ children }) {
            return <h1 className="mb-2 mt-4 text-lg font-bold text-foreground">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mb-2 mt-3 text-base font-bold text-foreground">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="mb-1 mt-2 text-sm font-semibold text-foreground">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="my-2 list-disc space-y-1 pl-5 marker:text-muted-foreground">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-foreground">{children}</li>;
          },
          p({ children }) {
            return <p className="my-1.5 leading-relaxed text-foreground">{children}</p>;
          },
          strong({ children }) {
            return <strong className="font-bold text-foreground">{children}</strong>;
          },
          a({ children, href }) {
            return <a href={href} className="font-medium text-primary underline underline-offset-2">{children}</a>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2 border-l-4 border-emerald-500/50 bg-emerald-500/10 py-1 pl-3 text-xs italic text-foreground">
                {children}
              </blockquote>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeText = String(children).replace(/\n$/, '');

            // Render as InteractiveChart if marked as chart, or if valid chart JSON in json/plain code blocks
            if (lang === 'chart' || lang === 'json' || !lang) {
              try {
                const trimmed = codeText.trim();
                if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                  const parsed = JSON.parse(trimmed);
                  if (
                    parsed &&
                    typeof parsed === 'object' &&
                    typeof parsed.type === 'string' &&
                    Array.isArray(parsed.data) &&
                    parsed.data.length > 0
                  ) {
                    return <InteractiveChart spec={parsed as ChartSpec} />;
                  }
                }
              } catch (e) {
                if (lang === 'chart') {
                  console.error('[ChatMarkdown] Failed to parse chart code block:', e);
                }
              }
            }

            const isInline = !match && !codeText.includes('\n');
            if (isInline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="my-2 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground dark:bg-black/40">
                <code className="font-mono" {...props}>
                  {codeText}
                </code>
              </div>
            );
          },
        }}
      >
        {sanitizedContent}
      </ReactMarkdown>

      {/* Render top-level chart payload ONLY if not already rendered inside the markdown */}
      {!hasEmbedded && attachedChart && <InteractiveChart spec={attachedChart} />}
    </div>
  );
};
