import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { chromium, expect as baseExpect } from '@playwright/test';
import { encode } from 'next-auth/jwt';

const expect = baseExpect.configure({ timeout: 15000 });
const base = process.env.AUDIT_BASE_URL || 'http://localhost:3101';
const database = new URL(process.env.DATABASE_URL || 'https://invalid');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname) || !['localhost', '127.0.0.1'].includes(database.hostname) || !database.pathname.startsWith('/product_')) {
  throw new Error('Six-finding QA requires a local server and isolated product_ database');
}
if (!process.env.NEXTAUTH_SECRET) throw new Error('Local NEXTAUTH_SECRET required');
const out = path.resolve(process.env.AUDIT_OUTPUT || 'artifacts/huella-audit-six/browser');
const axe = await fs.readFile(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const db = new PrismaClient();
const ids = ['viewer', 'friend', 'cat'].map((name) => 'six-qa-' + randomUUID() + '-' + name);
const results = [];
let browser;
let page;
let currentCase = 'setup';
await fs.mkdir(out, { recursive: true });

async function capture(label, scope = page) {
  if (scope === page) await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  else assert.equal(await scope.evaluate((element) => element.scrollWidth > element.clientWidth + 1), false, label + ': dialog overflow');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + ': page overflow');
  await page.addScriptTag({ content: axe });
  const violations = await (scope === page ? page.locator('body') : scope).evaluate(async (element) =>
    (await window.axe.run(element, { runOnly: { type: 'rule', values: ['label', 'select-name', 'aria-input-field-name', 'button-name', 'aria-dialog-name'] } })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))
  );
  assert.deepEqual(violations, [], label + ': accessible names');
  await page.screenshot({ path: path.join(out, label + '.png'), fullPage: scope === page });
}

async function contrast(button, label) {
  await button.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const samples = [];
  for (const state of ['normal', 'hover', 'focus', 'active']) {
    if (state === 'hover') await button.hover();
    if (state === 'focus') { await page.mouse.move(0, 0); await button.focus(); }
    if (state === 'active') { await button.hover(); await page.mouse.down(); }
    await button.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    await expect.poll(() => button.evaluate((element) => getComputedStyle(element).color)).toBe('rgb(255, 255, 255)');
    const sample = await button.evaluate((element) => {
      const css = getComputedStyle(element);
      const luminance = (color) => {
        const values = color.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      const foreground = luminance(css.color);
      const background = luminance(css.backgroundColor);
      return { foreground: css.color, background: css.backgroundColor, ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05), fontSize: css.fontSize, disabled: element.disabled };
    });
    samples.push({ state, ...sample });
    assert.ok(sample.ratio >= 4.5, label + ' ' + state + ' contrast ' + sample.ratio);
    if (state === 'active') { await page.mouse.move(0, 0); await page.mouse.up(); }
  }
  results.push({ case: label, contrast: samples, passed: true });
}

try {
  await db.user.createMany({ data: ids.map((id) => ({ id, email: id + '@example.test', name: 'Persona QA', emailVerified: new Date() })) });
  const owners = await Promise.all(ids.map((userId) => db.owner.create({ data: { userId, name: 'Persona QA', location: 'Buenos Aires', bio: 'Perfil local', latitude: -34.6, longitude: -58.4 } })));
  const petData = (ownerId, name, petType = 'dog') => ({ ownerId, name, petType, age: 3, size: 'medium', gender: 'female', energy: 'medium', bio: 'Le gusta pasear', activities: '["walk"]', location: 'Buenos Aires', images: '["/images/discovery-golden-retriever.png"]', latitude: -34.6, longitude: -58.4, vaccinated: true, neutered: true });
  const mine = await db.pet.create({ data: petData(owners[0].id, 'Lola QA') });
  const second = await db.pet.create({ data: petData(owners[0].id, 'Nina QA') });
  const friend = await db.pet.create({ data: petData(owners[1].id, 'Mora QA') });
  await db.pet.create({ data: petData(owners[2].id, 'Mishi QA', 'cat') });
  const group = await db.group.create({ data: { creatorId: ids[0], name: 'Grupo local QA', description: 'Grupo de verificación aislado', members: { create: { userId: ids[0], role: 'ADMIN' } } } });
  const past = await db.event.create({ data: { authorId: ids[0], groupId: group.id, title: 'Encuentro pasado QA', location: 'Parque QA', date: new Date('2020-01-01T18:00:00Z'), attendees: { create: { userId: ids[0] } } } });
  await db.event.create({ data: { authorId: ids[0], title: 'Evento público pasado QA', location: 'Parque QA', date: new Date('2020-01-02T18:00:00Z') } });
  const future = await db.event.create({ data: { authorId: ids[0], groupId: group.id, title: 'Encuentro futuro QA', location: 'Parque QA', date: new Date(Date.now() + 86400000 * 30) } });
  await db.post.create({ data: { authorId: ids[0], content: 'Pregunta de prueba local', postType: 'question', images: '[]' } });
  browser = await chromium.launch({ headless: true });
  const variants = [
    { name: 'desktop', viewport: { width: 1180, height: 757 }, zone: 'America/Los_Angeles' },
    { name: 'tablet', viewport: { width: 768, height: 1024 }, zone: 'UTC' },
    { name: 'mobile', viewport: { width: 390, height: 844 }, zone: 'America/Argentina/Buenos_Aires', isMobile: true, hasTouch: true },
  ];
  for (const variant of variants.filter((item) => !process.env.AUDIT_VIEWPORT || process.env.AUDIT_VIEWPORT === item.name)) {
    currentCase = variant.name;
    const context = await browser.newContext({ viewport: variant.viewport, timezoneId: variant.zone, isMobile: variant.isMobile, hasTouch: variant.hasTouch, reducedMotion: 'reduce' });
    const token = await encode({ secret: process.env.NEXTAUTH_SECRET, token: { sub: ids[0], id: ids[0], name: 'Persona QA', email: ids[0] + '@example.test', role: 'OWNER' }, maxAge: 3600 });
    await context.addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await db.swipe.deleteMany({ where: { fromPetId: { in: [mine.id, second.id] } } });
    await page.goto(base + '/profile');
    const trigger = page.getByRole('button', { name: 'Editar', exact: true }).first();
    await trigger.click();
    let dialog = page.getByRole('dialog', { name: 'Editar mascota', exact: true });
    const name = dialog.getByLabel('Nombre de la mascota', { exact: true });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(name).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Cerrar diálogo', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(name).toBeFocused();
    for (const label of ['¿Se lleva bien con niños?', '¿Se lleva bien con otros perros?', '¿Se lleva bien con gatos?', '¿Se lleva bien con extraños?']) await expect(dialog.getByRole('combobox', { name: label, exact: true })).toHaveText('No sé');
    await capture(variant.name + '-pet-dialog', dialog);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await name.fill('Nombre editado QA');
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Seguir editando' }).click();
    await expect(name).toHaveValue('Nombre editado QA');
    await expect(name).toBeFocused();
    await page.keyboard.press('Escape');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await name.fill('Mascota guardada ' + variant.name);
    let releaseSave;
    const pending = new Promise((resolve) => { releaseSave = resolve; });
    await page.route('**/api/pet/*', async (route) => {
      if (route.request().method() !== 'PUT') return route.continue();
      await pending;
      await route.fulfill({ status: 500, json: { error: 'Fallo de guardado simulado' } });
    });
    await dialog.getByRole('button', { name: 'Actualizar mascota' }).click();
    await expect(dialog.getByRole('button', { name: /Actualizando|Guardando/ })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
    releaseSave();
    await expect(dialog.getByRole('button', { name: 'Actualizar mascota' })).toBeEnabled();
    await expect(name).toHaveValue('Mascota guardada ' + variant.name);
    await page.unroute('**/api/pet/*');
    await dialog.getByRole('button', { name: 'Actualizar mascota' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.getByRole('button', { name: 'Editar perfil', exact: true }).click();
    const ownerDialog = page.getByRole('dialog', { name: 'Editar perfil', exact: true });
    await expect(ownerDialog).toBeVisible();
    assert.equal(await ownerDialog.evaluate((element) => element.contains(document.activeElement)), true);
    await page.keyboard.press('Escape');
    await expect(ownerDialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar perfil', exact: true })).toBeFocused();
    await page.goto(base + '/profile?petId=' + mine.id);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('main')).toBeFocused();
    console.log('PASS ' + variant.name + ' pet and owner dialogs');

    await page.goto(base + '/hogares-de-transito?create=case');
    dialog = page.getByRole('dialog', { name: 'Nueva solicitud de ayuda' });
    for (const label of ['Especie', 'Tamaño estimado', 'Urgencia', 'Necesidad principal', 'Radio de búsqueda']) await expect(dialog.getByRole('combobox', { name: label, exact: true })).toBeVisible();
    await capture(variant.name + '-rescue', dialog);
    await page.goto(base + '/hogares-de-transito?create=profile');
    dialog = page.getByRole('dialog', { name: 'Perfil de hogar de tránsito' });
    for (const label of ['Tipo de vivienda', 'Experiencia']) await expect(dialog.getByRole('combobox', { name: label, exact: true })).toBeVisible();
    await capture(variant.name + '-foster', dialog);
    await page.goto(base + '/hogares-de-transito?view=volunteer');
    await page.getByRole('button', { name: 'Ayudar como voluntario', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Perfil de voluntariado' });
    for (const label of ['Disponible desde', 'Disponible hasta']) {
      const field = dialog.getByLabel(label, { exact: true });
      await field.fill(label.endsWith('desde') ? '2026-11-01' : '2026-12-31');
      assert.ok((await field.boundingBox()).width >= 180, label + ': date needs enough width');
    }
    await dialog.getByLabel('Disponible desde', { exact: true }).scrollIntoViewIfNeeded();
    await capture(variant.name + '-volunteer', dialog);
    console.log('PASS ' + variant.name + ' help forms');

    await page.goto(base + '/community');
    await page.getByRole('button', { name: 'Responder pregunta', exact: true }).first().click();
    await expect(page.getByRole('textbox', { name: 'Escribí un comentario' }).first()).toBeVisible();
    await capture(variant.name + '-comments');
    await page.goto(base + '/shop');
    const search = page.getByRole('textbox', { name: 'Buscar negocio, servicio o zona' });
    await search.fill('Sin coincidencias QA');
    await capture(variant.name + '-services');

    await page.goto(base + '/community/groups');
    await page.getByRole('button', { name: 'Crear grupo', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Crear Nuevo Grupo' });
    await dialog.getByLabel('Nombre del Grupo').fill('Sólo borrador local');
    await contrast(dialog.getByRole('button', { name: 'Crear Grupo', exact: true }), variant.name + '-create-group');
    await capture(variant.name + '-create-group', dialog);
    await page.keyboard.press('Escape');
    await page.goto(base + '/pets/' + mine.id);
    await contrast(page.getByRole('button', { name: 'Compartir', exact: true }), variant.name + '-passport');
    await capture(variant.name + '-passport');
    await page.goto(base + '/community/groups/' + group.id);
    await page.getByRole('tab', { name: 'Eventos', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Finalizado', exact: true })).toBeDisabled();
    const futureCard = page.locator('[data-slot="card"]').filter({ has: page.getByText('Encuentro futuro QA', { exact: true }) });
    const attend = futureCard.getByRole('button', { name: /Asistir|Cancelar asistencia/ });
    await expect(attend).toBeEnabled();
    await attend.click();
    await expect(attend).toHaveText(/Cancelar asistencia|Asistir/);
    await expect.poll(() => db.eventAttendee.count({ where: { eventId: future.id, userId: ids[0] } })).toBe(1);
    await attend.click();
    await expect.poll(() => db.eventAttendee.count({ where: { eventId: future.id, userId: ids[0] } })).toBe(0);
    await capture(variant.name + '-group-events');
    await page.getByText('Encuentro pasado QA', { exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Asistentes: Encuentro pasado QA' });
    await contrast(dialog.getByRole('button', { name: 'Descargar CSV' }), variant.name + '-csv');
    await capture(variant.name + '-attendees', dialog);
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: /Chat grupal/i }).click();
    await contrast(page.getByRole('button', { name: 'Enviar mensaje' }), variant.name + '-chat');
    await capture(variant.name + '-chat');
    await page.goto(base + '/community/events');
    await page.getByRole('button', { name: 'Pasados', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Finalizado', exact: true })).toHaveCount(2);
    for (const action of await page.getByRole('button', { name: 'Finalizado', exact: true }).all()) await expect(action).toBeDisabled();
    assert.equal(await db.eventAttendee.count({ where: { eventId: past.id, userId: ids[0] } }), 1);
    await capture(variant.name + '-past-events');
    console.log('PASS ' + variant.name + ' contrast and events');

    await page.goto(base + '/inicio?tab=home&petId=' + mine.id);
    await expect(page.getByRole('link', { name: /Conocé a Mora QA/ })).toBeVisible();
    await expect(page.getByText('Conocé a Mishi QA')).not.toBeVisible();
    await page.getByRole('link', { name: /Conocé a Mora QA/ }).click();
    await expect(page.getByRole('heading', { name: /Mora QA/ })).toBeVisible();
    await capture(variant.name + '-discover');
    await page.getByRole('button', { name: 'Ahora no', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ya conociste a todos por aquí' })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('link', { name: /Conocé una mascota/ })).toBeVisible();
    await expect(page.getByText('Conocé a Mora QA')).not.toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', { name: 'Ya conociste a todos por aquí' })).toBeVisible();
    await capture(variant.name + '-empty-discover');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ya conociste a todos por aquí' })).toBeVisible();
    assert.equal(await db.swipe.count({ where: { fromPetId: mine.id, toPetId: friend.id, undoneAt: null } }), 1);
    assert.deepEqual(errors, [], variant.name + ': browser runtime errors');
    results.push({ viewport: variant.viewport, timezone: variant.zone, passed: true, checks: ['pet dialog keyboard, dirty guard, failed and successful save, focus return', 'owner dialog regression', 'accessible names', 'volunteer full dates', 'button contrast states', 'past attendance preserved and future attendance toggles', 'eligible recommendations, swipe, empty state and history', 'responsive overflow and runtime errors'] });
    await context.close();
    console.log('PASS ' + variant.name);
  }
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, currentCase + '-failure.png') });
  results.push({ case: currentCase, passed: false, url: page?.url(), error: error.message });
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await db.user.deleteMany({ where: { id: { in: ids } } });
  const remaining = await db.user.count({ where: { id: { in: ids } } });
  await fs.writeFile(path.join(out, 'results.json'), JSON.stringify({ results, cleanupRemainingUsers: remaining }, null, 2));
  await db.$disconnect();
}
