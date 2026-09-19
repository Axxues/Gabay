import { Loader2 } from 'lucide-react';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  hint?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ fileName, progress, hint }) => {
  return (
    <div className="p-2.5 bg-muted/40 border border-border rounded-xl space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-border shrink-0">
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
          <div className="truncate">
            <span className="text-xs font-bold text-foreground block truncate">{fileName}</span>
            <span className="text-[10px] text-muted-foreground font-sans">{hint ?? 'Uploading...'}</span>
          </div>
        </div>
        <span className="text-xs font-bold text-primary tabular-nums shrink-0">{progress}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label={`Uploading ${fileName}`}
        className="h-1.5 w-full bg-muted rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
