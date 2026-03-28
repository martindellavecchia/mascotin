import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
    petsCount: number;
    matchesCount: number;
}

export function StatsCard({ petsCount, matchesCount }: StatsCardProps) {
    return (
        <Card className="shadow-sm border-0 bg-white">
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-3 bg-teal-50 rounded-xl">
                        <p className="text-2xl font-bold text-teal-600">{petsCount}</p>
                        <p className="text-xs text-gray-500">Mascotas</p>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl">
                        <p className="text-2xl font-bold text-rose-500">{matchesCount}</p>
                        <p className="text-xs text-gray-500">Matches</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
