'use client';

import { ArrowLeftRight, Heart, PawPrint, Star, type LucideIcon } from 'lucide-react';
import type { HomeStatsData } from '@/lib/server/home';

interface HomeStatsProps {
  stats: HomeStatsData;
}

export default function HomeStats({ stats }: HomeStatsProps) {
  const statItems: { label: string; value: number; icon: LucideIcon }[] = [
    {
      label: 'Mascotas',
      value: stats.totalPets,
      icon: PawPrint,
    },
    {
      label: 'Matches',
      value: stats.totalMatches,
      icon: Heart,
    },
    {
      label: 'Swipes',
      value: stats.totalSwipes,
      icon: ArrowLeftRight,
    },
    {
      label: 'Likes',
      value: stats.likesReceived,
      icon: Star,
    },
  ];

  return (
    <div className="hidden sm:grid grid-cols-4 gap-3">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
        >
          <Icon className="size-6 text-teal-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900 leading-none">
              {item.value}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{item.label}</p>
          </div>
        </div>
        );
      })}
    </div>
  );
}
