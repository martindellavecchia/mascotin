import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, BadgeCheck, MapPin, MessageSquareText, Star, Store } from 'lucide-react';
import BusinessOwnerBadge from '@/components/business/BusinessOwnerBadge';
import { BookServiceButton } from '@/components/shop/StoreBookingIsland';
import StoreReviewActionsIsland from '@/components/shop/StoreReviewActionsIsland';
import StoreReviewFormIsland from '@/components/shop/StoreReviewFormIsland';
import { StoreViewerProvider } from '@/components/shop/StoreViewerProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { STORE_PLACE_TAG_LABELS, type StorePlaceTag } from '@/lib/places';
import type { PublicStoreDetail } from '@/lib/server/stores';

const trustClasses: Record<string, string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
};

export default function StoreDetailView({ store }: { store: PublicStoreDetail }) {
  return (
    <StoreViewerProvider store={{ id: store.id, slug: store.slug }}>
      <main className="min-h-screen bg-background pb-14">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <Link href="/shop" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">
              <ArrowLeft className="size-5" aria-hidden="true" />
              Todos los negocios
            </Link>
            <div className="mt-5 grid min-w-0 gap-6 sm:grid-cols-[160px_1fr] sm:items-center xl:grid-cols-[160px_1fr_auto]">
              <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-primary-soft sm:h-40 sm:w-40">
                {store.image ? (
                  <img src={store.image} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="size-20 text-teal-700/35" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">{store.category.name}</Badge>
                  <Badge variant="outline" className={trustClasses[store.trust.tone] || trustClasses.slate}>
                    {store.trust.label}
                  </Badge>
                  {(store.tags || []).slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline">
                      {STORE_PLACE_TAG_LABELS[tag as StorePlaceTag] || tag}
                    </Badge>
                  ))}
                  {(store.tags || []).length > 3 && <Badge variant="neutral">+{store.tags.length - 3}</Badge>}
                </div>
                <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900 [overflow-wrap:anywhere]">
                  {store.name}
                </h1>
                <p className="mt-2 max-w-2xl break-words text-slate-600 [overflow-wrap:anywhere]">{store.description}</p>
                {store.address && (
                  <p className="mt-3 flex min-w-0 items-start gap-1 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">
                    <MapPin className="size-5 shrink-0" aria-hidden="true" />
                    {store.address}
                  </p>
                )}
              </div>
              <div className="border-t border-border px-0 pt-5 text-left sm:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                <p className="flex items-center justify-center gap-1 text-3xl font-bold text-slate-900">
                  <Star className="size-8 text-amber-500" aria-hidden="true" fill="currentColor" />
                  {store.reviewCount ? store.ratingAverage.toFixed(1) : '—'}
                </p>
                <p className="mt-1 text-sm text-slate-500">{store.reviewCount} reseñas verificadas</p>
                <p className="mt-2 max-w-48 text-xs leading-relaxed text-slate-500">{store.trust.description}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl min-w-0 gap-7 px-4 py-8 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-7">
            <section>
              <h2 className="text-xl font-bold text-slate-900">Servicios disponibles</h2>
              <div className="mt-4 divide-y divide-border border-y border-border bg-surface">
                {store.services.length ? store.services.map((service) => (
                  <article key={service.id} className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-bold text-slate-900 [overflow-wrap:anywhere]">{service.name}</h3>
                        <Badge variant="neutral">{service.duration} min</Badge>
                      </div>
                      <p className="mt-1 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">{service.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <span className="text-lg font-bold text-primary">${service.price.toLocaleString('es-AR')}</span>
                      <BookServiceButton service={{ id: service.id, name: service.name, price: service.price }} />
                    </div>
                  </article>
                )) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">Este negocio todavía no publicó servicios reservables.</div>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Experiencias de la comunidad</h2>
                  <p className="mt-1 text-sm text-slate-500">Sólo cuentan citas marcadas como completadas.</p>
                </div>
                <Badge variant="outline">{store.reviewCount} reseñas</Badge>
              </div>
              <div className="mt-4 divide-y divide-border border-y border-border bg-surface">
                {store.reviews.length ? store.reviews.map((review) => (
                  <article key={review.id} className="px-4 py-5">
                      <div className="flex items-start gap-3">
                        <span className="relative shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={review.author.image || undefined} />
                            <AvatarFallback>{review.author.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          {review.author.isBusinessOwner && <BusinessOwnerBadge />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">{review.author.name || 'Usuario de Huella'}</p>
                              <p className="text-xs text-slate-400">
                                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: es })}
                              </p>
                            </div>
                            <div className="flex" aria-label={`${review.rating} de 5 estrellas`}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`size-5 ${star <= review.rating ? 'text-amber-500' : 'text-slate-200'}`}
                                  aria-hidden="true"
                                  fill={star <= review.rating ? 'currentColor' : 'none'}
                                />
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="mt-3 break-words text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]">
                              {review.comment}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                            <Badge variant="verified">
                              <BadgeCheck className="mr-1 size-3.5" aria-hidden="true" />
                              Cita verificada
                            </Badge>
                            <StoreReviewActionsIsland
                              review={{ id: review.id, helpfulCount: review.helpfulCount }}
                              hasBusinessReply={Boolean(review.businessReply)}
                            />
                          </div>
                          {review.businessReply && (
                            <div className="mt-4 rounded-xl border-l-4 border-teal-500 bg-teal-50 px-4 py-3">
                              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Respuesta del negocio</p>
                              <p className="mt-1 break-words text-sm text-slate-700 [overflow-wrap:anywhere]">
                                {review.businessReply}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                  </article>
                )) : (
                  <EmptyState
                    className="border-0"
                    icon={<MessageSquareText className="size-11" aria-hidden="true" />}
                    title="Todavía no hay reseñas"
                    description="La primera aparecerá después de una cita completada."
                  />
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <StoreReviewFormIsland />
          </aside>
        </div>
      </main>
    </StoreViewerProvider>
  );
}
