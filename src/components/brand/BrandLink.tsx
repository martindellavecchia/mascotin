import Link from 'next/link';
import BrandLogo from '@/components/brand/BrandLogo';
import { cn } from '@/lib/utils';

interface BrandLinkProps {
  className?: string;
  logoClassName?: string;
  priority?: boolean;
}

export default function BrandLink({ className, logoClassName, priority = false }: BrandLinkProps) {
  return (
    <Link
      href="/"
      className={cn('inline-flex min-h-11 items-center', className)}
      aria-label="Huella, ir al inicio"
    >
      <BrandLogo priority={priority} className={logoClassName} />
    </Link>
  );
}
