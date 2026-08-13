'use client';

import type { HomeStatsData } from '@/lib/server/home';

interface HomeStatsProps {
  stats: HomeStatsData;
}

export default function HomeStats({ stats }: HomeStatsProps) {
  const statItems = [
    {
      label: 'Mascotas',
      value: stats.totalPets,
      icon: 'pets',
    },
    {
      label: 'Matches',
      value: stats.totalMatches,
      icon: 'favorite',
    },
    {
      label: 'Swipes',
      value: stats.totalSwipes,
      icon: 'swipe',
    },
    {
      label: 'Likes',
      value: stats.likesReceived,
      icon: 'star',
    },
  ];

  return (
    <div className="hidden sm:grid grid-cols-4 gap-3">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
        >
          <span className="material-symbols-rounded text-xl text-teal-600">
            {item.icon}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900 leading-none">
              {item.value}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
