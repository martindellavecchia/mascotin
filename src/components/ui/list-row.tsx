import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  leading?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  trailing?: ReactNode;
}

export function ListRow({
  leading,
  title,
  description,
  metadata,
  trailing,
  className,
  ...props
}: ListRowProps) {
  return (
    <div
      className={cn('flex min-w-0 items-start gap-4 px-4 py-4 transition-colors hover:bg-primary-soft/45', className)}
      {...props}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground">{title}</div>
        {description && <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div>}
        {metadata && <div className="mt-2 text-xs text-muted-foreground">{metadata}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
