import React from 'react';
import { FileQuestion, ArrowLeft } from 'lucide-react';

interface EmptyPageProps {
  title: string;
  onNavigateTab?: (tab: string) => void;
}

export const EmptyPage: React.FC<EmptyPageProps> = ({ title, onNavigateTab }) => {
  return (
    <div className="flex min-h-full w-full flex-1 flex-col p-6 max-w-6xl mx-auto space-y-6 animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-border/70">
        <div className="flex items-center space-x-3">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="p-2 bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer active:scale-[0.98]"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Overview and details for {title}.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State Box */}
      <div className="p-12 text-center bg-card border border-border rounded-2xl space-y-3 flex flex-col items-center justify-center min-h-[360px]">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          {title} is Empty
        </h2>
        <p className="text-xs text-muted-foreground max-w-md">
          There is no content available for this section yet.
        </p>
      </div>
    </div>
  );
};

export default EmptyPage;
