import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { chromium, expect as baseExpect } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const expect = baseExpect.configure({ timeout: 15000 });
const base = process.env.AUDIT_BASE_URL || 'http://localhost:3100';
const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname) || !['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Browser audit requires an isolated local product_ database and local server');
}
if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is required for isolated QA sessions');
const db = new PrismaClient();
const prefix = 'browser-audit-' + randomUUID();
const ids = ['viewer', 'friend', 'empty'].map((name) => prefix + '-' + name);
const [viewer, friend, empty] = ids;
const out = path.resolve('artifacts/audit-remediation');
const axeSource = await fs.readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const results = [];
let browser;
let currentPage;
let currentCase = 'setup';
await fs.mkdir(out, { recursive: true });

async function contextFor(userId, viewport, timezoneId) {
  const context = await browser.newContext({ viewport, timezoneId, reducedMotion: 'reduce' });
  const token = await encode({ secret: process.env.NEXTAUTH_SECRET, token: { sub: userId, id: userId, role: 'OWNER', name: 'Persona QA', email: userId + '@example.test', isBusinessOwner: false }, maxAge: 3600 });
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
  return context;
}

async function checkPage(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + ': horizontal overflow');
  const badIds = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    const missing = [...document.querySelectorAll('label[for]')].map((node) => node.htmlFor).filter((id) => !document.getElementById(id));
    return { duplicates, missing };
  });
  assert.deepEqual(badIds, { duplicates: [], missing: [] }, label + ': unique label targets');
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'rule', values: ['label', 'select-name', 'aria-input-field-name', 'button-name', 'aria-dialog-name'] } })).violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })));
  assert.deepEqual(violations, [], label + ': accessible control names');
  await page.screenshot({ path: path.join(out, label + '.png'), fullPage: true });
}

try {
  await db.user.createMany({ data: ids.map((id) => ({ id, email: id + '@example.test', name: 'Persona QA', emailVerified: new Date() })) });
  const owners = await Promise.all(ids.map((userId) => db.owner.create({ data: { userId, name: 'Persona QA', location: 'Buenos Aires', bio: 'Perfil de prueba', latitude: -34.6, longitude: -58.38 } })));
  const petData = (ownerId, name, latitude = -34.6) => ({ ownerId, name, petType: 'dog', age: 3, size: 'medium', gender: 'female', energy: 'medium', bio: 'Le gusta pasear', activities: '["walk"]', location: 'Buenos Aires', images: '[]', latitude, longitude: -58.38, vaccinated: true, neutered: true });
  const first = await db.pet.create({ data: petData(owners[0].id, 'Lola QA') });
  const second = await db.pet.create({ data: petData(owners[0].id, 'Nina QA') });
  await db.pet.create({ data: petData(owners[1].id, 'Mora QA', -34.7) });
  await db.userSettings.create({ data: { userId: viewer, matchDistance: 50 } });
  const group = await db.group.create({ data: { creatorId: viewer, name: 'Grupo QA', description: 'Grupo de prueba aislado', members: { create: { userId: viewer, role: 'ADMIN' } } } });
  browser = await chromium.launch({ headless: true });
  const variants = [
    { name: 'desktop', viewport: { width: 1440, height: 900 }, zone: 'America/Los_Angeles' },
    { name: 'tablet', viewport: { width: 834, height: 1112 }, zone: 'UTC' },
    { name: 'mobile', viewport: { width: 390, height: 844 }, zone: 'America/Argentina/Buenos_Aires' },
  ];

  for (const variant of variants.filter((item) => !process.env.AUDIT_VIEWPORT || process.env.AUDIT_VIEWPORT === item.name)) {
    currentCase = variant.name;
    const context = await contextFor(viewer, variant.viewport, variant.zone);
    const page = await context.newPage();
    currentPage = page;
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    let exploreRequests = 0;
    page.on('request', (request) => { if (new URL(request.url()).pathname === '/api/pets') exploreRequests += 1; });
    await db.userSettings.update({ where: { userId: viewer }, data: { matchDistance: 50 } });
    await page.goto(base + '/inicio?tab=home&petId=' + second.id);
    await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible();
    assert.equal(exploreRequests, 0, 'Home must not eagerly fetch explore data');
    const marker = await page.evaluate(() => { window.auditNavigationMarker = crypto.randomUUID(); return window.auditNavigationMarker; });
    await page.getByRole('link', { name: /Conocé a|Conocé una mascota/ }).click();
    await expect(page.getByRole('heading', { name: 'Descubrir', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Mora QA/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Descubrir', exact: true })).toHaveAttribute('aria-current', 'page');
    assert.equal(new URL(page.url()).searchParams.get('petId'), second.id);
    assert.equal(await page.evaluate(() => window.auditNavigationMarker), marker);
    assert.equal(exploreRequests, 1);
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Descubrir', exact: true })).toBeVisible();
    await checkPage(page, variant.name + '-discover');

    await page.getByRole('link', { name: 'Preferencias de búsqueda' }).click();
    await expect(page).toHaveURL(/\/settings\?/);
    await expect(page.getByRole('tab', { name: 'Mascotas', exact: true })).toHaveAttribute('aria-selected', 'true');
    const distance = page.getByRole('slider', { name: 'Distancia máxima' });
    await expect(distance).toHaveAttribute('aria-valuenow', '50');
    await distance.focus();
    const saved = page.waitForResponse((response) => response.url().endsWith('/api/settings') && response.request().method() === 'PATCH');
    await page.keyboard.press('Home');
    assert.equal((await saved).status(), 200);
    await expect(distance).toHaveAttribute('aria-valuenow', '5');
    assert.equal((await db.userSettings.findUniqueOrThrow({ where: { userId: viewer } })).matchDistance, 5);
    await checkPage(page, variant.name + '-preferences');
    await page.getByRole('link', { name: 'Volver a Descubrir' }).click();
    await expect(page.getByRole('heading', { name: 'Ya conociste a todos por aquí' })).toBeVisible();
    assert.equal(new URL(page.url()).searchParams.get('petId'), second.id);

    await page.goto(base + '/profile');
    const trigger = page.getByRole('button', { name: 'Editar perfil', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    let dialog = page.getByRole('dialog', { name: 'Editar perfil' });
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press(index < 6 ? 'Tab' : 'Shift+Tab');
      assert.equal(await dialog.evaluate((element) => element.contains(document.activeElement)), true, 'Profile focus must remain in dialog');
    }
    const name = dialog.getByLabel('Nombre completo');
    await name.fill('Persona con cambios');
    await page.keyboard.press('Escape');
    const confirm = page.getByRole('alertdialog', { name: '¿Descartar cambios?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Seguir editando' }).click();
    await expect(name).toHaveValue('Persona con cambios');
    await expect(name).toBeFocused();
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    dialog = page.getByRole('dialog', { name: 'Editar perfil' });
    await checkPage(page, variant.name + '-profile-dialog');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();

    await trigger.click();
    dialog = page.getByRole('dialog', { name: 'Editar perfil' });
    await dialog.getByLabel('Nombre completo').fill('Persona QA ' + variant.name);
    let releaseSave;
    const pendingSave = new Promise((resolve) => { releaseSave = resolve; });
    await page.route('**/api/owner/profile', async (route) => {
      if (route.request().method() !== 'PUT') return route.continue();
      await pendingSave;
      await route.fulfill({ status: 500, json: { success: false, error: 'Fallo de guardado simulado' } });
    });
    const failedSave = page.waitForResponse((response) => response.url().endsWith('/api/owner/profile') && response.status() === 500);
    await dialog.getByRole('button', { name: 'Guardar perfil' }).click();
    await expect(dialog.getByRole('button', { name: /Guardando/ })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    releaseSave();
    await failedSave;
    await expect(dialog.getByLabel('Nombre completo')).toHaveValue('Persona QA ' + variant.name);
    await expect(dialog.getByRole('button', { name: 'Guardar perfil' })).toBeEnabled();
    await page.unroute('**/api/owner/profile');
    const profileSave = page.waitForResponse((response) => response.url().endsWith('/api/owner/profile') && response.request().method() === 'PUT');
    await dialog.getByRole('button', { name: 'Guardar perfil' }).click();
    assert.equal((await profileSave).status(), 200);
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    assert.equal((await db.owner.findUniqueOrThrow({ where: { userId: viewer } })).name, 'Persona QA ' + variant.name);
    await page.goto(base + '/profile?edit=true');
    await expect(page.getByRole('dialog', { name: 'Editar perfil' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('main')).toBeFocused();

    await page.goto(base + '/settings');
    for (const label of ['Contraseña actual', 'Nueva contraseña', 'Confirmar nueva contraseña']) {
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('type', 'password');
    }
    await page.goto(base + '/community');
    await page.getByRole('button', { name: 'Compartí con la comunidad' }).click();
    await page.getByRole('tab', { name: 'Evento', exact: true }).click();
    await page.getByLabel('Contenido de la publicación').fill('Encuentro QA ' + variant.name);
    await page.getByLabel('Fecha y hora (Argentina)').fill('2026-12-06T18:11');
    await page.getByLabel('Ubicación', { exact: true }).fill('Parque QA');
    await expect(page.getByLabel('Mascota de la publicación')).toBeVisible();
    await checkPage(page, variant.name + '-event-form');
    const creation = page.waitForResponse((response) => response.url().endsWith('/api/posts') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Publicar', exact: true }).click();
    const created = await (await creation).json();
    assert.equal(created.success, true);
    assert.equal(created.post.eventDate, '2026-12-06T21:11:00.000Z');
    const postCard = page.locator('[data-slot="card"]').filter({ has: page.getByText('Encuentro QA ' + variant.name, { exact: true }) });
    await postCard.getByRole('button', { name: 'Más opciones' }).click();
    await page.getByRole('menuitem', { name: 'Editar', exact: true }).click();
    const postEditor = page.getByRole('dialog', { name: 'Editar Publicación' });
    await expect(postEditor.getByLabel('Fecha y hora (Argentina)')).toHaveValue('2026-12-06T18:11');
    await postEditor.getByLabel('Ubicación', { exact: true }).fill('Parque QA actualizado');
    const postSave = page.waitForResponse((response) => response.url().endsWith('/api/posts/' + created.post.id) && response.request().method() === 'PUT');
    await postEditor.getByRole('button', { name: 'Guardar Cambios' }).click();
    assert.equal((await postSave).status(), 200);
    assert.equal((await db.event.findUniqueOrThrow({ where: { id: created.post.eventId } })).date.toISOString(), created.post.eventDate);

    for (const mode of ['lost', 'found']) {
      await page.goto(base + '/alerts?report=' + mode);
      const alert = page.getByRole('dialog', { name: mode === 'lost' ? 'Reportar mascota perdida' : 'Reportar mascota encontrada' });
      await expect(alert).toBeVisible();
      if (mode === 'lost') await expect(alert.getByRole('combobox', { name: '¿Es tu mascota?' })).toBeEnabled();
      await alert.getByLabel('Descripción *', { exact: true }).fill('Alerta aislada de prueba ' + variant.name);
      await alert.getByLabel(mode === 'lost' ? 'Última ubicación vista *' : 'Dónde la encontraste *', { exact: true }).fill('Parque QA');
      await alert.getByLabel('Teléfono de contacto *', { exact: true }).fill('1100000000');
      await checkPage(page, variant.name + '-' + mode + '-form');
      const alertSave = page.waitForResponse((response) => response.url().endsWith('/api/posts') && response.request().method() === 'POST');
      await alert.getByRole('button', { name: 'Publicar alerta' }).click();
      assert.equal((await alertSave).status(), 200);
      await expect(alert).not.toBeVisible();
    }

    const instant = '2026-12-06T21:11:29.123Z';
    const title = 'Fiesta QA ' + variant.name;
    const response = await context.request.post(base + '/api/groups/' + group.id + '/posts', { data: { postType: 'event', content: 'Evento de prueba ' + variant.name, title, eventDate: instant, eventLocation: 'Parque QA' } });
    assert.equal(response.status(), 200);
    const post = (await response.json()).post;
    await page.goto(base + '/community/groups/' + group.id);
    await page.getByRole('tab', { name: 'Eventos', exact: true }).click();
    await page.getByRole('button', { name: 'Editar ' + title, exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Editar evento' });
    await expect(editor.getByLabel('Fecha y hora (Argentina)')).toHaveValue('2026-12-06T18:11');
    await editor.getByLabel('Título', { exact: true }).fill(title + ' editada');
    const update = page.waitForResponse((item) => item.url().endsWith('/api/events/' + post.eventId) && item.request().method() === 'PUT');
    await editor.getByRole('button', { name: 'Guardar cambios' }).click();
    assert.equal((await update).status(), 200);
    assert.equal((await db.event.findUniqueOrThrow({ where: { id: post.eventId } })).date.toISOString(), instant);
    await expect(page.getByText('6 dic 2026 · 18:11 (hora de Argentina)').first()).toBeVisible();
    await checkPage(page, variant.name + '-group-events');
    const midnightTitle = 'Medianoche QA ' + variant.name;
    await db.event.create({ data: { authorId: viewer, title: midnightTitle, date: new Date('2026-12-07T01:30:00.000Z'), location: 'Parque QA' } });
    await page.goto(base + '/community/events');
    const midnightCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: midnightTitle, exact: true }) });
    await expect(midnightCard.getByText('22:30 (hora de Argentina)', { exact: true })).toBeVisible();
    await expect(midnightCard.getByText('6', { exact: true })).toBeVisible();
    const dayLabel = await page.evaluate(() => new Date('2026-12-06T12:00:00').toLocaleDateString());
    const calendarDay = page.locator('button[data-day="' + dayLabel + '"]');
    for (let month = 0; month < 12 && !(await calendarDay.count()); month += 1) await page.locator('.rdp-button_next').click();
    await calendarDay.click();
    await expect(midnightCard).toBeVisible();
    await checkPage(page, variant.name + '-event-calendar');
    const nextDay = await page.evaluate(() => new Date('2026-12-07T12:00:00').toLocaleDateString());
    if (!(await page.locator('button[data-day="' + nextDay + '"]').count())) await page.locator('.rdp-button_next').click();
    await page.locator('button[data-day="' + nextDay + '"]').click();
    await expect(page.getByRole('heading', { name: midnightTitle, exact: true })).not.toBeVisible();
    await db.userSettings.update({ where: { userId: viewer }, data: { matchDistance: 50 } });
    await page.route('**/api/pets?*', (route) => route.fulfill({ status: 500, json: { success: false, error: 'Fallo simulado' } }));
    await page.goto(base + '/inicio?tab=explore&petId=' + first.id);
    await expect(page.getByRole('heading', { name: 'No pudimos cargar mascotas' })).toBeVisible();
    await page.unroute('**/api/pets?*');
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Mora QA/ })).toBeVisible();
    await page.goto(base + '/inicio?tab=invalid&petId=unknown');
    await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible();
    await page.goto(base + '/settings?tab=invalid');
    await expect(page.getByRole('tab', { name: 'Cuenta', exact: true })).toHaveAttribute('aria-selected', 'true');
    assert.deepEqual(pageErrors, [], 'Unexpected browser runtime errors');

    const emptyContext = await contextFor(empty, variant.viewport, variant.zone);
    const emptyPage = await emptyContext.newPage();
    await emptyPage.goto(base + '/inicio');
    await emptyPage.getByRole('link', { name: 'Descubrir', exact: true }).click();
    await expect(emptyPage.getByRole('heading', { name: 'Creá una mascota para empezar a descubrir' })).toBeVisible();
    await emptyPage.goBack();
    await expect(emptyPage.getByRole('heading', { name: 'También podés crear el perfil de tu mascota' })).toBeVisible();
    await emptyContext.close();
    await context.close();
    results.push({ viewport: variant.viewport, timezone: variant.zone, passed: true, checks: ['CTA and history', 'active pet', 'preferences persistence and refresh', 'profile focus, discard, save failure and success', 'field names and lost/found alerts', 'event and post creation and edit round trip', 'error recovery and invalid URLs', 'no-pet navigation', 'overflow and accessibility names', 'browser runtime'] });
    console.log('PASS ' + variant.name + ' / ' + variant.zone);
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed()) await currentPage.screenshot({ path: path.join(out, currentCase + '-failure.png'), fullPage: true });
  results.push({ case: currentCase, passed: false, url: currentPage?.url(), error: error.message });
  process.exitCode = 1;
  console.error(error.stack);
} finally {
  await browser?.close();
  await db.user.deleteMany({ where: { id: { in: ids } } });
  const remaining = await db.user.count({ where: { id: { in: ids } } });
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, cleanupRemainingUsers: remaining }, null, 2));
  await db.$disconnect();
}
