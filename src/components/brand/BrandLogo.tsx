import Image from 'next/image';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

export default function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand/huella-logo.png"
      alt="Huella"
      width={360}
      height={130}
      priority={priority}
      className={cn('h-10 w-auto object-contain', className)}
      sizes="(min-width: 1024px) 168px, 132px"
    />
  );
}
