import { MapPin, PawPrint, Trees } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Owner } from "@/types";

interface ProfileCardProps {
    owner: Owner;
    email?: string;
}

export function ProfileCard({ owner, email }: ProfileCardProps) {
    const location = owner.location === "Buenos Airs" ? "Buenos Aires" : owner.location;
    const initials = owner.name.split(' ').map((n) => n[0]).join('');

    return (
        <Card className="overflow-hidden">
            <div className="h-24 bg-teal-100"></div>
            <CardContent className="pt-0 pb-6 px-6 -mt-12">
                <Avatar className="w-24 h-24 border-4 border-white mx-auto">
                    {owner.image ? (
                        <AvatarImage src={owner.image} alt={owner.name} className="object-cover" />
                    ) : (
                        <AvatarFallback className="bg-teal-500 text-white text-2xl font-bold">
                            {initials}
                        </AvatarFallback>
                    )}
                </Avatar>
                <div className="text-center mt-4">
                    <h2 className="text-xl font-bold text-slate-900">{owner.name}</h2>
                    {email && <p className="text-slate-500 text-sm">{email}</p>}

                    {location && (
                        <div className="flex items-center justify-center gap-1 mt-2 text-teal-600">
                            <MapPin className="size-5" aria-hidden="true" />
                            <span className="text-sm font-medium">{location}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {owner.hasYard && (
                        <Badge variant="neutral" className="gap-1">
                            <Trees className="size-4" aria-hidden="true" />
                            Tiene patio
                        </Badge>
                    )}
                    {owner.hasOtherPets && (
                        <Badge variant="neutral" className="gap-1">
                            <PawPrint className="size-4" aria-hidden="true" />
                            Otras mascotas
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
