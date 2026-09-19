import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { LMSProvider } from '@/contexts/LMSContext';
import { GabayChatProvider } from '@/contexts/GabayChatContext';
import { router } from '@/app/router';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  handleResetCache = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (_) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground font-sans">
          <div className="max-w-md w-full p-8 bg-card border border-border rounded-2xl shadow-xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl font-black">
              !
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black">Application Recovery</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Gabay encountered an issue while loading. You can refresh or reset the local cache to continue smoothly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl transition-all cursor-pointer"
              >
                Reset Local Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => (
  <AppErrorBoundary>
    <LMSProvider>
      <GabayChatProvider>
        <RouterProvider router={router} />
      </GabayChatProvider>
    </LMSProvider>
  </AppErrorBoundary>
);
export default App;
