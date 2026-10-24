'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'teal' | 'slate' | 'white';
}

export function LoadingSpinner({ className, size = 'md', variant = 'teal' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-[3px]',
        lg: 'w-10 h-10 border-[3px]',
    };

    const variantClasses = {
        teal: 'border-primary/15 border-t-primary',
        slate: 'border-border border-t-muted-foreground',
        white: 'border-white/30 border-t-white',
    };

    return (
        <div className={cn('flex items-center justify-center', className)}>
            <div className={cn('animate-spin rounded-full motion-reduce:animate-none', sizeClasses[size], variantClasses[variant])} />
        </div>
    );
}

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('animate-pulse rounded bg-muted motion-reduce:animate-none', className)} />;
}

export function LoadingCard() {
    return (
        <div className="h-40 rounded-lg border border-border bg-surface p-4">
            <div className="mb-4 flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
            </div>
            <Skeleton className="h-16 w-full" />
        </div>
    );
}

export function LoadingDots({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center gap-1', className)}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" style={{ animationDelay: '300ms' }} />
        </div>
    );
}
