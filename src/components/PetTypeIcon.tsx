import { Bird, Fish, PawPrint, Rabbit, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const PET_TYPE_ICONS: Record<string, LucideIcon> = {
  dog: PawPrint,
  cat: PawPrint,
  bird: Bird,
  fish: Fish,
  rabbit: Rabbit,
  other: PawPrint,
};

interface PetTypeIconProps {
  petType?: string | null;
  className?: string;
}

export function PetTypeIcon({ petType, className }: PetTypeIconProps) {
  const Icon = (petType && PET_TYPE_ICONS[petType]) || PawPrint;
  return <Icon className={cn('size-5', className)} aria-hidden="true" />;
}
