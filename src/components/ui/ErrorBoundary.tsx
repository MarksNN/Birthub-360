import React, { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          className="p-6 text-center border border-red-500 rounded bg-red-50 dark:bg-red-950/20"
        >
          <h2 className="text-lg font-bold text-red-600 dark:text-red-400">
            Ocorreu um erro inesperado
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {this.state.error?.message || 'Por favor recarregue a página ou contate o suporte.'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
