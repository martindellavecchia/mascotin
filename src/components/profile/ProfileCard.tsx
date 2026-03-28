import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Owner } from "@/types";

interface ProfileCardProps {
    owner: Owner;
    email?: string;
}

export function ProfileCard({ owner, email }: ProfileCardProps) {
    // Data Cleanup Logic
    const location = owner.location === "Buenos Airs" ? "Buenos Aires" : owner.location;
    const initials = owner.name.split(' ').map((n) => n[0]).join('');

    return (
        <Card className="shadow-sm border-0 bg-white overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <CardContent className="pt-0 pb-6 px-6 -mt-12">
                <Avatar className="w-24 h-24 border-4 border-white shadow-lg mx-auto">
                    {owner.image ? (
                        <AvatarImage src={owner.image} alt={owner.name} className="object-cover" />
                    ) : (
                        <AvatarFallback className="bg-teal-500 text-white text-2xl font-bold">
                            {initials}
                        </AvatarFallback>
                    )}
                </Avatar>
                <div className="text-center mt-4">
                    <h2 className="text-xl font-bold text-gray-900">{owner.name}</h2>
                    {email && <p className="text-gray-500 text-sm">{email}</p>}

                    {location && (
                        <div className="flex items-center justify-center gap-1 mt-2 text-teal-600">
                            <span className="material-symbols-rounded text-lg">location_on</span>
                            <span className="text-sm font-medium">{location}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {owner.hasYard && (
                        <Badge className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">
                            🏡 Tiene patio
                        </Badge>
                    )}
                    {owner.hasOtherPets && (
                        <Badge className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">
                            🐾 Otras mascotas
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
