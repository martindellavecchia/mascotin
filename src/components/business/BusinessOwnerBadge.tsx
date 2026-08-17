'use client';

import { Store } from 'lucide-react';
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
              'absolute -bottom-1 -right-1 z-10 flex size-5 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-teal-600 text-white shadow-sm',
              className
            )}
            role="img"
            aria-label="Owner de negocio verificado"
          >
            <Store className="size-3" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">Owner de negocio en MascoTin</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
