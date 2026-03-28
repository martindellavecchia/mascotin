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
        lg: 'w-12 h-12 border-4',
    };

    const variantClasses = {
        teal: 'border-teal-200 border-t-teal-500',
        slate: 'border-slate-200 border-t-slate-400',
        white: 'border-white/30 border-t-white',
    };

    return (
        <div className={cn('flex items-center justify-center', className)}>
            <div className={cn('animate-spin rounded-full', sizeClasses[size], variantClasses[variant])} />
        </div>
    );
}

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('animate-pulse bg-slate-200 rounded', className)} />;
}

export function LoadingCard() {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm h-40 animate-pulse">
            <div className="flex gap-3 mb-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 bg-slate-200 rounded w-1/3" />
                    <Skeleton className="h-3 bg-slate-200 rounded w-1/4" />
                </div>
            </div>
            <Skeleton className="h-16 bg-slate-200 rounded w-full" />
        </div>
    );
}

export function LoadingDots({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center gap-1', className)}>
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
    );
}
