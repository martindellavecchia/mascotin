import crypto from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { chromium, request } from '@playwright/test';

const baseUrl = (process.env.CANARY_BASE_URL || 'https://mascotin-pi.vercel.app').replace(/\/$/, '');
if (process.env.CANARY_RUN !== 'true') {
  throw new Error('Definí CANARY_RUN=true para ejecutar el canary sintético.');
}
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL para asociar y auditar el SyntheticRun.');

const db = new PrismaClient();
const runSuffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const password = `Canary-${crypto.randomBytes(16).toString('base64url')}!9a`;
const imageUrl = `${baseUrl}/icons/icon-512.png`;
let runId;
let adopterContext;
let browserProfileDir;
const apiContexts = [];

async function responseJson(response, label) {
  const contentType = response.headers()['content-type'] || '';
  const payload = contentType.includes('application/json') ? await response.json() : { body: (await response.text()).slice(0, 500) };
  if (!response.ok() || payload.success === false) {
    throw new Error(`${label} falló (${response.status()}): ${payload.error || payload.body || 'respuesta inválida'}`);
  }
  return payload;
}

async function login(api, email) {
  const csrf = await responseJson(await api.get('/api/auth/csrf'), `CSRF ${email}`);
  await api.post('/api/auth/callback/credentials', {
    form: { csrfToken: csrf.csrfToken, email, password, callbackUrl: baseUrl, json: 'true' },
  });
  const session = await responseJson(await api.get('/api/auth/session'), `sesión ${email}`);
  if (!session.user?.id) throw new Error(`No se pudo iniciar sesión sintética para ${email}`);
  return session;
}

async function apiFor(email) {
  const api = await request.newContext({ baseURL: baseUrl });
  apiContexts.push(api);
  await login(api, email);
  return api;
}

async function waitForPush(userId, notificationType, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const delivery = await db.pushDelivery.findFirst({
      where: {
        status: { in: ['RECEIVED', 'CLICKED'] },
        providerStatus: { not: null },
        notification: { userId, type: notificationType },
      },
      include: { notification: { select: { id: true, type: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (delivery) return delivery;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`No se recibió confirmación Web Push para ${notificationType}`);
}

try {
  const run = await db.syntheticRun.create({
    data: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  runId = run.id;
  const hashedPassword = await bcrypt.hash(password, 12);
  const roles = ['responsable', 'hogar', 'voluntario', 'adoptante'];
  const users = {};
  for (const role of roles) {
    users[role] = await db.user.create({
      data: {
        name: `Canary ${role}`,
        email: `canary-${runSuffix}-${role}@example.invalid`,
        password: hashedPassword,
        emailVerified: new Date(),
        syntheticRunId: run.id,
      },
    });
  }

  const requesterApi = await apiFor(users.responsable.email);
  const fosterApi = await apiFor(users.hogar.email);
  const volunteerApi = await apiFor(users.voluntario.email);

  browserProfileDir = await mkdtemp(join(tmpdir(), 'mascotin-canary-'));
  adopterContext = await chromium.launchPersistentContext(browserProfileDir, {
    headless: true,
    channel: process.env.CANARY_BROWSER_CHANNEL || 'chrome',
    baseURL: baseUrl,
    permissions: ['notifications'],
  });
  await adopterContext.grantPermissions(['notifications'], { origin: baseUrl });
  await login(adopterContext.request, users.adoptante.email);
  const adopterApi = adopterContext.request;

  await responseJson(await fosterApi.put('/api/foster/profile', { data: {
    acceptsSpecies: ['dog'], acceptsSizes: ['medium', 'any'], capacity: 2,
    location: 'Palermo, CABA', latitude: -34.5889, longitude: -58.4305,
    radiusKm: 5,
    availableFrom: '', availableUntil: '', maxDurationDays: 30, housingType: 'house',
    hasYard: true, hasKids: false, hasOtherPets: false, experience: 'experienced', notes: 'Canary aislado',
    adultDeclared: true, termsAccepted: true,
  } }), 'perfil de hogar');

  await responseJson(await volunteerApi.put('/api/volunteer/profile', { data: {
    roles: ['TRANSPORT', 'VET_COMPANION', 'FIELD_SUPPORT', 'SUPPLIES_LOGISTICS'],
    location: 'Palermo, CABA', latitude: -34.5895, longitude: -58.431,
    radiusKm: 5, availableFrom: '', availableUntil: '', maxConcurrentTasks: 5,
    notes: 'Canary aislado', adultDeclared: true, termsAccepted: true,
  } }), 'perfil de voluntariado');

  await responseJson(await adopterApi.put('/api/adoptions/profile', { data: {
    housingType: 'house', hasYard: true, hasKids: false, hasOtherPets: false,
    experience: 'experienced', hoursAvailable: 'Todo el día', notes: 'Canary aislado',
  } }), 'perfil adoptante');

  await responseJson(await adopterApi.put('/api/solidarity-alerts', { data: {
    location: 'Palermo, CABA', latitude: -34.588, longitude: -58.43, locationConsent: true,
    subscriptions: [
      { type: 'FOSTER', enabled: true, radiusKm: 5, species: ['dog'], sizes: ['medium'], urgencies: ['HIGH'] },
      { type: 'ADOPTION', enabled: true, radiusKm: 5, species: ['dog'], sizes: ['medium'], urgencies: [] },
      { type: 'VETERINARY', enabled: true, radiusKm: 5, species: ['dog'], sizes: [], urgencies: ['HIGH'] },
    ],
  } }), 'suscripciones solidarias');

  const page = await adopterContext.newPage();
  await page.goto('/hogares-de-transito?view=alerts', { waitUntil: 'networkidle' });
  const pushCapabilities = await page.evaluate(() => ({
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'unsupported',
    secureContext: window.isSecureContext,
  }));
  const activatePush = page.getByRole('button', { name: 'Activar notificaciones push' });
  try {
    await activatePush.waitFor({ state: 'visible', timeout: 20_000 });
  } catch {
    const visibleText = (await page.locator('body').innerText()).slice(-1000);
    throw new Error(`No apareció la activación Web Push. Capacidades=${JSON.stringify(pushCapabilities)} UI=${visibleText}`);
  }
  await activatePush.click();
  try {
    const deactivatePush = page.getByRole('button', { name: 'Desactivar push' });
    const toast = page.locator('[data-sonner-toast]').first();
    const outcome = await Promise.race([
      deactivatePush.waitFor({ state: 'visible', timeout: 30_000 }).then(() => ({ type: 'subscribed' })),
      toast.waitFor({ state: 'visible', timeout: 30_000 }).then(async () => ({ type: 'toast', text: await toast.innerText() })),
    ]);
    if (outcome.type === 'toast' && !outcome.text?.includes('activadas')) {
      throw new Error(outcome.text || 'El navegador rechazó la suscripción Push');
    }
    await deactivatePush.waitFor({ state: 'visible', timeout: 30_000 });
  } catch {
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    const visibleText = (await page.locator('body').innerText()).slice(-400);
    throw new Error(`No se completó la suscripción Web Push. Capacidades=${JSON.stringify(pushCapabilities)} Toasts=${JSON.stringify(toasts)} UI=${visibleText}`);
  }

  const created = await responseJson(await requesterApi.post('/api/rescue-cases', { data: {
    species: 'dog', size: 'medium', urgency: 'HIGH', apparentCondition: 'Estable y consciente',
    description: 'Canary productivo aislado para validar el circuito completo de la red solidaria.',
    images: [imageUrl], location: 'Palermo, CABA', latitude: -34.5885, longitude: -58.4302,
    searchRadiusKm: 5, requestedDays: 7, primaryNeed: 'FOSTER',
    additionalNeeds: ['TRANSPORT', 'VETERINARY'],
    needDetails: { FOSTER: 'Alojamiento por siete días', TRANSPORT: 'Traslado corto', VETERINARY: 'Acompañamiento a consulta' },
    consentAccepted: true,
  } }), 'crear caso');
  const caseId = created.case.id;

  const fosterPush = await waitForPush(users.adoptante.id, 'FOSTER_CASE_ALERT');

  const publication = await responseJson(await requesterApi.put(`/api/rescue-cases/${caseId}/publication`, { data: {
    summary: 'Perro mediano necesita tránsito y apoyo operativo por pocos días.',
    publicZone: 'Palermo, CABA', imageIndex: 0,
  } }), 'publicar caso');
  const wall = await responseJson(await requesterApi.get('/api/posts?postType=foster_case&limit=20'), 'consultar muro');
  const wallPost = wall.posts.find((post) => post.rescueCase?.id === caseId);
  if (!wallPost) throw new Error('El caso publicado no apareció en el muro');
  if (!['FOSTER', 'TRANSPORT', 'VETERINARY'].every((needType) => wallPost.rescueCase.openNeedTypes.includes(needType))) {
    throw new Error('El muro no expuso todas las necesidades abiertas del caso');
  }
  for (const privateKey of ['latitude', 'longitude', 'contactPhone', 'lastSeenLocation']) {
    if (Object.hasOwn(wallPost, privateKey)) throw new Error(`El muro expuso el campo privado ${privateKey}`);
  }

  const fosterContact = await responseJson(await fosterApi.post(`/api/rescue-cases/${caseId}/interest`, { data: {
    needType: 'FOSTER', message: 'Puedo alojarlo durante los siete días del caso canario.',
  } }), 'contacto de hogar desde el muro');
  if (fosterContact.kind !== 'FOSTER' || fosterContact.status !== 'INTERESTED') throw new Error('El contacto de hogar no quedó interesado');
  await responseJson(await requesterApi.post(`/api/foster/offers/${fosterContact.offerId}/messages`, { data: {
    content: 'Gracias. Coordinemos los detalles antes de seleccionar el hogar.',
  } }), 'respuesta previa a la selección del hogar');
  let detail = await responseJson(await requesterApi.get(`/api/rescue-cases/${caseId}`), 'detalle para seleccionar hogar');
  const interestedFoster = detail.case.offers.find((offer) => offer.id === fosterContact.offerId && offer.status === 'INTERESTED');
  if (!interestedFoster || interestedFoster.source !== 'WALL') throw new Error('La oferta de hogar no conservó el origen WALL');
  const selectedFoster = await responseJson(await requesterApi.post(`/api/foster/offers/${interestedFoster.id}/select`), 'seleccionar hogar');
  const placementId = selectedFoster.placement.id;
  await responseJson(await requesterApi.post(`/api/foster/placements/${placementId}/confirm`), 'confirmar entrega responsable');
  await responseJson(await fosterApi.post(`/api/foster/placements/${placementId}/confirm`), 'confirmar recepción hogar');
  await responseJson(await requesterApi.post(`/api/foster/placements/${placementId}/messages`, { data: { content: 'Mensaje canario de coordinación de tránsito.' } }), 'chat de tránsito');
  const fosterChat = await responseJson(await fosterApi.get(`/api/foster/offers/${fosterContact.offerId}/messages?limit=20`), 'leer historial continuo de tránsito');
  if (fosterChat.messages.length < 3 || !fosterChat.messages.some((message) => message.content.includes('canario'))) {
    throw new Error('El chat de tránsito no conservó el historial anterior y posterior a la selección');
  }

  const volunteerOverview = await responseJson(await volunteerApi.get('/api/volunteer/offers'), 'ofertas de voluntariado');
  const operationalOffers = volunteerOverview.offers.filter((offer) => offer.rescueCase.id === caseId && ['TRANSPORT', 'VETERINARY'].includes(offer.need.type));
  if (operationalOffers.length !== 2) throw new Error(`Se esperaban 2 ofertas operativas y llegaron ${operationalOffers.length}`);
  const assignmentIds = [];
  const volunteerContactIds = [];
  for (const offer of operationalOffers) {
    const contact = await responseJson(await volunteerApi.post(`/api/rescue-cases/${caseId}/interest`, { data: {
      needType: offer.need.type, message: `Puedo colaborar con ${offer.need.type} en el caso canario.`,
    } }), `contacto ${offer.need.type} desde el muro`);
    if (contact.kind !== 'VOLUNTEER' || contact.status !== 'INTERESTED') throw new Error(`El contacto ${offer.need.type} no quedó interesado`);
    volunteerContactIds.push(contact.offerId);
    await responseJson(await requesterApi.post(`/api/volunteer/offers/${contact.offerId}/messages`, { data: {
      content: `Coordinemos ${offer.need.type} antes de confirmar a la persona responsable.`,
    } }), `respuesta previa ${offer.need.type}`);
    detail = await responseJson(await requesterApi.get(`/api/rescue-cases/${caseId}`), `selección ${offer.need.type}`);
    const interested = detail.case.volunteerOffers.find((candidate) => candidate.id === contact.offerId && candidate.status === 'INTERESTED');
    if (!interested || interested.source !== 'WALL') throw new Error(`La oferta ${offer.need.type} no conservó el origen WALL`);
    const selected = await responseJson(await requesterApi.post(`/api/volunteer/offers/${interested.id}/select`), `asignar ${offer.need.type}`);
    assignmentIds.push(selected.assignment.id);
  }
  await responseJson(await volunteerApi.post(`/api/volunteer/assignments/${assignmentIds[0]}/messages`, { data: { content: 'Mensaje canario de tarea operativa.' } }), 'chat de voluntariado');
  const volunteerChat = await responseJson(await requesterApi.get(`/api/volunteer/offers/${volunteerContactIds[0]}/messages?limit=20`), 'leer historial continuo de voluntariado');
  if (volunteerChat.messages.length < 3 || !volunteerChat.messages.some((message) => message.content.includes('tarea operativa'))) {
    throw new Error('El chat de voluntariado no conservó el historial anterior y posterior a la selección');
  }
  for (const assignmentId of assignmentIds) {
    await responseJson(await requesterApi.post(`/api/volunteer/assignments/${assignmentId}/complete`), 'completar voluntariado');
  }

  await responseJson(await requesterApi.post(`/api/foster/placements/${placementId}/complete`, { data: { outcome: 'NEEDS_ADOPTION' } }), 'pasar a adopción');
  await responseJson(await fosterApi.put(`/api/foster/adoption-drafts/${caseId}`, { data: {
    name: 'Canary', breed: 'Mestizo', estimatedAge: 2, gender: 'male', energy: 'medium',
    character: 'Sociable, tranquilo y acostumbrado al contacto con personas.',
    bio: 'Animal del canary sintético aislado, publicado para validar el recorrido productivo completo.',
    goodWithKids: 'unknown', goodWithDogs: 'yes', goodWithCats: 'unknown', vaccinated: null, neutered: null,
    specialNeeds: '', requirements: 'Entrevista responsable', publicZone: 'Palermo, CABA', images: [imageUrl],
  } }), 'completar ficha de adopción');
  const publishedAdoption = await responseJson(await fosterApi.post(`/api/foster/adoption-drafts/${caseId}/publish`), 'publicar adopción');
  const listingId = publishedAdoption.listingId;
  const adoptionPush = await waitForPush(users.adoptante.id, 'SOLIDARITY_ADOPTION_ALERT');

  const application = await responseJson(await adopterApi.post(`/api/adoptions/${listingId}`, { data: {
    message: 'Quiero adoptar responsablemente y acompañar a Canary durante toda su vida.',
  } }), 'postulación de adopción');
  await responseJson(await fosterApi.patch(`/api/adoptions/applications/${application.application.id}`, { data: { status: 'ACCEPTED' } }), 'aceptar postulación');
  await responseJson(await fosterApi.post(`/api/adoptions/${listingId}/handoff/confirm`, { data: {} }), 'confirmar entrega hogar');
  const handoff = await responseJson(await adopterApi.post(`/api/adoptions/${listingId}/handoff/confirm`, { data: {
    ownerName: 'Canary Adoptante', ownerLocation: 'Palermo, CABA',
  } }), 'confirmar entrega adoptante');
  if (!handoff.completed) throw new Error('La entrega definitiva no quedó completada');

  const finalDetail = await responseJson(await requesterApi.get(`/api/rescue-cases/${caseId}`), 'estado final');
  if (finalDetail.case.status !== 'RESOLVED') throw new Error(`El caso terminó en ${finalDetail.case.status} y no RESOLVED`);
  const internalAlert = await db.notification.findFirst({
    where: { userId: users.adoptante.id, type: 'SOLIDARITY_ADOPTION_ALERT', entityId: listingId },
  });
  if (!internalAlert) throw new Error('No se persistió la notificación interna de adopción');
  const wallContactNotification = await db.notification.findFirst({
    where: { userId: users.responsable.id, type: 'FOSTER_RESPONSE', entityId: fosterContact.offerId },
  });
  if (!wallContactNotification || wallContactNotification.body.includes('Puedo alojarlo')) {
    throw new Error('La notificación del contacto faltó o expuso el texto privado de la nota');
  }

  await db.syntheticRun.update({ where: { id: run.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
  await db.rateLimitBucket.deleteMany({
    where: {
      key: {
        in: Object.values(users).flatMap((user) => [
          `rescue-contact:${user.id}`,
          `rescue-message:${user.id}`,
        ]),
      },
    },
  });
  await db.syntheticRun.delete({ where: { id: run.id } });
  const [remainingRuns, remainingUsers, remainingCases] = await Promise.all([
    db.syntheticRun.count({ where: { id: run.id } }),
    db.user.count({ where: { syntheticRunId: run.id } }),
    db.rescueCase.count({ where: { id: caseId } }),
  ]);
  if (remainingRuns !== 0 || remainingUsers !== 0 || remainingCases !== 0) {
    throw new Error('La limpieza exacta del SyntheticRun no eliminó todos sus datos');
  }
  runId = undefined;
  console.log(JSON.stringify({
    success: true,
    runId: run.id,
    caseId,
    publicationId: publication.publication.id,
    wallPostId: wallPost.id,
    placementId,
    volunteerAssignmentIds: assignmentIds,
    fosterContactOfferId: fosterContact.offerId,
    volunteerContactOfferIds: volunteerContactIds,
    listingId,
    applicationId: application.application.id,
    internalNotificationId: internalAlert.id,
    push: {
      foster: { deliveryId: fosterPush.id, providerStatus: fosterPush.providerStatus, status: fosterPush.status },
      adoption: { deliveryId: adoptionPush.id, providerStatus: adoptionPush.providerStatus, status: adoptionPush.status },
    },
    finalStatus: finalDetail.case.status,
    expiresAt: run.expiresAt.toISOString(),
    cleanup: { runId: run.id, deleted: true },
  }, null, 2));
} catch (error) {
  if (runId) {
    await db.syntheticRun.update({
      where: { id: runId },
      data: { status: 'FAILED', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    }).catch(() => undefined);
  }
  console.error(error instanceof Error ? error.message : 'Canary productivo fallido');
  process.exitCode = 1;
} finally {
  await Promise.allSettled(apiContexts.map((context) => context.dispose()));
  if (adopterContext) await adopterContext.close();
  if (browserProfileDir) await rm(browserProfileDir, { recursive: true, force: true });
  await db.$disconnect();
}
