import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  headingLevel?: 'h1' | 'h2' | 'h3';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className,
  headingLevel = 'h2',
}: EmptyStateProps) {
  const Heading = headingLevel;

  return (
    <div
      className={cn(
        'flex flex-col items-center border border-dashed border-border bg-surface px-5 text-center',
        compact ? 'rounded-lg py-8' : 'rounded-xl py-12',
        className,
      )}
    >
      {icon && <div className="mb-3 text-primary/45">{icon}</div>}
      <Heading className="text-base font-semibold text-foreground">{title}</Heading>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
