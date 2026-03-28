'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Profile } from '@/types';
import Image from 'next/image';

interface ProfileCardProps {
  profile: Profile;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  let images: string[] = [];
  try {
    const parsed = JSON.parse(profile.images || '[]');
    if (Array.isArray(parsed)) {
      images = parsed.filter((img): img is string => typeof img === 'string' && img.length > 0);
    }
  } catch {
    images = [];
  }
  const mainImage = images[0] || '/placeholder.svg';
  const interests = profile.interests.split(',').filter((i: string) => i.trim());

  return (
    <Card className="overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-300">
      <CardContent className="p-0">
        {/* Image Section */}
        <div className="relative w-full aspect-[3/4] overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100">
          <Image
            src={mainImage}
            alt={profile.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Name and Age Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h2 className="text-3xl font-bold mb-1">
              {profile.name}, {profile.age}
            </h2>
            <div className="flex items-center gap-2 text-white/90">
              <span className="material-symbols-rounded text-lg">location_on</span>
              <span className="text-sm">{profile.location}</span>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-6 space-y-4">
          {/* Bio */}
          <div>
            <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
          </div>

          {/* Interests */}
          {interests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600 font-medium">
                <span className="material-symbols-rounded w-4 h-4">local_offer</span>
                <span className="text-sm">Interests</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest: string, index: number) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-rose-100 text-rose-700 hover:bg-rose-200"
                  >
                    {interest.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="flex items-center gap-2 text-gray-600 pt-2 border-t border-gray-100">
            <span className="material-symbols-rounded w-4 h-4">calendar_month</span>
            <span className="text-sm">
              Looking for: {profile.gender === 'female' ? 'Men' : profile.gender === 'male' ? 'Women' : 'Everyone'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
