import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StateFeedbackProps {
  status: 'error' | 'loading';
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function StateFeedback({ status, title, description, action, className }: StateFeedbackProps) {
  const isError = status === 'error';
  const Icon = isError ? CircleAlert : LoaderCircle;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-xl border bg-surface p-4 sm:p-5', isError ? 'border-destructive/30' : 'border-border', className)}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', isError ? 'text-destructive' : 'animate-spin text-primary motion-reduce:animate-none')} aria-hidden="true" />
      <div className="min-w-0 space-y-2">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
