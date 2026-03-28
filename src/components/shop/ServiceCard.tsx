'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ServiceCardProps {
    title: string;
    provider: string;
    rating: number;
    reviews: number;
    price: number;
    image: string;
    category: string;
}

export default function ServiceCard({ title, provider, rating, reviews, price, image, category }: ServiceCardProps) {
    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-all">
            <div className="relative h-48 overflow-hidden">
                <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <Badge className="absolute top-3 left-3 bg-white/90 text-emerald-800 hover:bg-white">{category}</Badge>
            </div>
            <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-lg text-gray-800 line-clamp-1">{title}</h3>
                        <p className="text-sm text-gray-500">{provider}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 mb-4">
                    <span className="material-symbols-rounded text-yellow-400 text-sm filled">star</span>
                    <span className="font-bold text-sm">{rating}</span>
                    <span className="text-xs text-gray-400">({reviews} res.)</span>
                </div>

                <div className="flex items-center justify-between mt-auto">
                    <span className="font-bold text-lg text-teal-600">${price.toLocaleString()}</span>
                    <Button size="sm" className="bg-teal-50 text-teal-600 hover:bg-teal-100">Reservar</Button>
                </div>
            </CardContent>
        </Card>
    );
}
