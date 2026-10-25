import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NativeSelectProps extends ComponentProps<'select'> {
  wrapperClassName?: string;
}

/** Native select styled like SelectTrigger, for forms that rely on native behavior. */
export function NativeSelect({ className, wrapperClassName, children, ...props }: NativeSelectProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          'h-11 w-full min-w-0 appearance-none rounded-md border border-border-control bg-surface py-2 pl-3 pr-9 text-base font-normal text-foreground outline-none transition-[border-color] hover:border-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
