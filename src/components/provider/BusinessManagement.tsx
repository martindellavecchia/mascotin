'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Category { id: string; name: string }
interface Store {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  image: string | null;
  ratingAverage: number;
  reviewCount: number;
  trust: { label: string; description: string };
  bookingServices: Array<{ id: string }>;
}

export default function BusinessManagement() {
  const { update } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    image: '',
  });

  const hydrateForm = (value: Store) => {
    setForm({
      categoryId: value.categoryId,
      name: value.name,
      description: value.description || '',
      phone: value.phone || '',
      email: value.email || '',
      address: value.address || '',
      image: value.image || '',
    });
  };

  const load = async () => {
    try {
      const [categoryResponse, storeResponse] = await Promise.all([
        fetch('/api/store-categories'),
        fetch('/api/provider/store'),
      ]);
      const [categoryData, storeData] = await Promise.all([categoryResponse.json(), storeResponse.json()]);
      if (categoryData.success) {
        setCategories(categoryData.categories);
        setForm((current) => ({ ...current, categoryId: current.categoryId || categoryData.categories[0]?.id || '' }));
      }
      if (storeData.success && storeData.stores[0]) {
        setStore(storeData.stores[0]);
        hydrateForm(storeData.stores[0]);
      }
    } catch (error) {
      console.error('Error loading business management:', error);
      toast.error('No se pudo cargar tu negocio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(store ? `/api/provider/store/${store.id}` : '/api/provider/store', {
        method: store ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setStore(data.store);
      hydrateForm(data.store);
      await update();
      router.refresh();
      toast.success(store ? 'Negocio actualizado' : 'Tu negocio ya está publicado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el negocio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />;

  return (
    <div className="space-y-5">
      {store ? (
        <Card className="overflow-hidden border-teal-200 bg-gradient-to-r from-teal-50 to-white">
          <CardContent className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-teal-600 hover:bg-teal-600">Negocio publicado</Badge>
                <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">{store.trust.label}</Badge>
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900">{store.name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {store.reviewCount ? `${store.ratingAverage.toFixed(1)} · ${store.reviewCount} reseñas verificadas` : 'Todavía sin reseñas verificadas'}
              </p>
            </div>
            <Button asChild variant="outline" className="border-teal-200 bg-white text-teal-700">
              <Link href={`/shop/${store.slug}`}><span className="material-symbols-rounded mr-2 text-lg">open_in_new</span>Ver perfil público</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-teal-300 bg-teal-50/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700"><span className="material-symbols-rounded text-2xl">add_business</span></div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Publicá tu negocio</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Al publicarlo, tus servicios aparecerán agrupados en un perfil puntuable y tu avatar mostrará el badge de owner de negocio.</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-lg">{store ? 'Información pública' : 'Datos del negocio'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Nombre *</label><Input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Ej: Huellitas Grooming" /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Categoría *</label><Select value={form.categoryId} onValueChange={(value) => setField('categoryId', value)}><SelectTrigger><SelectValue placeholder="Elegí una categoría" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción *</label><Textarea value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Contá qué hacen, su experiencia y qué los diferencia..." rows={4} /><p className="mt-1 text-xs text-slate-400">Mínimo 20 caracteres al crear el negocio.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium text-slate-700">Teléfono</label><Input value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="+54 11..." /></div><div><label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label><Input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder="contacto@negocio.com" /></div></div>
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Dirección o zona</label><Input value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Palermo, Buenos Aires" /></div>
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">URL de imagen</label><Input value={form.image} onChange={(event) => setField('image', event.target.value)} placeholder="https://..." /></div>
          <div className="flex justify-end border-t border-slate-100 pt-4"><Button className="bg-teal-600 hover:bg-teal-700" onClick={() => void save()} disabled={saving || !form.categoryId || !form.name.trim() || !form.description.trim()}>{saving ? 'Guardando...' : store ? 'Guardar cambios' : 'Publicar negocio'}</Button></div>
        </CardContent>
      </Card>

      {store && <PromotionCard storeId={store.id} />}
    </div>
  );
}

function PromotionCard({ storeId }: { storeId: string }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Promoción destacada</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Título" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Textarea placeholder="Detalle de la promoción" value={body} onChange={(event) => setBody(event.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          <Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            const response = await fetch(`/api/provider/store/${storeId}/promotions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, body, startsAt, endsAt }),
            });
            const data = await response.json();
            toast[data.success ? 'success' : 'error'](data.success ? 'Promoción publicada y negocio destacado' : data.error);
          }}
        >
          Publicar promoción
        </Button>
      </CardContent>
    </Card>
  );
}
