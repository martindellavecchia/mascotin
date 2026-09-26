'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { ExternalLink, Store } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { STORE_PLACE_TAGS, STORE_PLACE_TAG_LABELS, type StorePlaceTag } from '@/lib/places';
import { getTimeZoneLabel } from '@/lib/timezone-label';

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
  tags?: string[];
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
    tags: [] as string[],
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
      tags: Array.isArray(value.tags) ? value.tags : [],
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

  const toggleTag = (tag: StorePlaceTag) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
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
        <Card className="overflow-hidden border-teal-200 bg-primary-soft">
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
              <Link href={`/shop/${store.slug}`}><ExternalLink className="mr-2 size-5" aria-hidden="true" />Ver perfil público</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-teal-300 bg-teal-50/60">
          <CardContent className="p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-700"><Store className="size-7" aria-hidden="true" /></div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Publicá tu negocio</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Al publicarlo, tus servicios aparecerán agrupados en un perfil con reseñas y tu avatar mostrará la insignia de dueño/a del negocio.</p>
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Etiquetas pet-friendly</label>
            <div className="flex flex-wrap gap-2">
              {STORE_PLACE_TAGS.map((tag) => {
                const selected = form.tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? 'border-teal-500 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
                    }`}
                  >
                    {STORE_PLACE_TAG_LABELS[tag]}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">URL de imagen</label><Input value={form.image} onChange={(event) => setField('image', event.target.value)} placeholder="https://..." /></div>
          <div className="flex justify-end border-t border-slate-100 pt-4"><Button className="bg-teal-600 hover:bg-teal-700" onClick={() => void save()} disabled={saving || !form.categoryId || !form.name.trim() || !form.description.trim()}>{saving ? 'Guardando...' : store ? 'Guardar cambios' : 'Publicar negocio'}</Button></div>
        </CardContent>
      </Card>

      {store && <PromotionCard storeId={store.id} />}
    </div>
  );
}

function PromotionCard({ storeId }: { storeId: string }) {
  const fieldId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const deviceTimeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

  const publish = async () => {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Completá la fecha de inicio y de fin');
      return;
    }
    if (end <= start) {
      toast.error('La fecha de fin tiene que ser posterior al inicio');
      return;
    }
    setPublishing(true);
    try {
      const response = await fetch(`/api/provider/store/${storeId}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, startsAt: start.toISOString(), endsAt: end.toISOString() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Promoción publicada y negocio destacado');
      setTitle('');
      setBody('');
      setStartsAt('');
      setEndsAt('');
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : 'No se pudo publicar la promoción');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Promoción destacada</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor={`${fieldId}-title`} className="mb-1.5 block">Título</Label>
          <Input id={`${fieldId}-title`} placeholder="Ej: 20% off en baños" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <Label htmlFor={`${fieldId}-body`} className="mb-1.5 block">Detalle</Label>
          <Textarea id={`${fieldId}-body`} placeholder="Detalle de la promoción" value={body} onChange={(event) => setBody(event.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${fieldId}-start`} className="mb-1.5 block">Inicio</Label>
            <Input id={`${fieldId}-start`} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} aria-describedby={`${fieldId}-tz`} />
          </div>
          <div>
            <Label htmlFor={`${fieldId}-end`} className="mb-1.5 block">Fin</Label>
            <Input id={`${fieldId}-end`} type="datetime-local" value={endsAt} min={startsAt || undefined} onChange={(event) => setEndsAt(event.target.value)} aria-describedby={`${fieldId}-tz`} />
          </div>
        </div>
        <p id={`${fieldId}-tz`} className="text-xs text-slate-500">
          Las fechas usan la hora de tu dispositivo ({getTimeZoneLabel(deviceTimeZone)}). La promoción se muestra en tu perfil público mientras esté vigente.
        </p>
        <Button variant="outline" onClick={() => void publish()} disabled={publishing || !title.trim() || !body.trim() || !startsAt || !endsAt}>
          {publishing ? 'Publicando...' : 'Publicar promoción'}
        </Button>
      </CardContent>
    </Card>
  );
}
