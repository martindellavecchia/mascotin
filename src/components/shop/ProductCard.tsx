'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
    title: string;
    price: number;
    image: string;
    category: string;
}

export default function ProductCard({ title, price, image, category }: ProductCardProps) {
    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-all">
            <div className="relative h-48 overflow-hidden">
                <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <Badge className="absolute top-3 right-3 bg-white/90 text-gray-800 hover:bg-white">{category}</Badge>
            </div>
            <CardContent className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-1">{title}</h3>
                <div className="flex items-center justify-between mt-4">
                    <span className="font-bold text-lg text-gray-900">${price.toLocaleString()}</span>
                    <Button size="sm" className="rounded-full w-8 h-8 p-0 bg-teal-500 hover:bg-teal-600">
                        <span className="material-symbols-rounded text-white text-sm">add</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
