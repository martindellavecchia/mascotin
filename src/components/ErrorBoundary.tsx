'use client';

import React from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-foreground">Algo salió mal</h1>
            <p className="mb-5 max-w-md text-muted-foreground">
              Ha ocurrido un error inesperado. Por favor, recarga la página.
            </p>
            <Button
              onClick={() => window.location.reload()}
            >
              Recargar página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
