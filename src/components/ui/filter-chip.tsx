import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface FilterChipProps extends Omit<ComponentProps<'button'>, 'type'> {
  active: boolean;
}

export function FilterChip({ active, className, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-slot="filter-chip"
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        active
          ? 'border-primary bg-primary-soft text-primary'
          : 'border-border bg-surface text-muted-foreground hover:border-border-control hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}
