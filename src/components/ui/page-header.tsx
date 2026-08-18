import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>}
        <h1 className={cn('text-2xl font-bold tracking-[-0.035em] text-foreground sm:text-3xl', eyebrow && 'mt-2')}>
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
