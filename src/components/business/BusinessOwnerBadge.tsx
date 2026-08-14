'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BusinessOwnerBadgeProps {
  className?: string;
  compact?: boolean;
}

export default function BusinessOwnerBadge({ className, compact = false }: BusinessOwnerBadgeProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'absolute -bottom-1 -right-1 z-10 flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-teal-600 text-white shadow-sm',
              compact ? 'h-4 w-4' : 'h-5 w-5',
              className
            )}
            role="img"
            aria-label="Owner de negocio verificado"
          >
            <span className={cn('material-symbols-rounded leading-none', compact ? 'text-[10px]' : 'text-[12px]')}>
              storefront
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Owner de negocio en MascoTin</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
