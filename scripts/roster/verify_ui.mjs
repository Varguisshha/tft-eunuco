/** Optional real-browser diagnostic: PLAYWRIGHT_MODULE points at an installed Playwright package. */
import process from 'node:process';
import console from 'node:console';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(process.env.PLAYWRIGHT_MODULE + '/index.mjs').href
    : 'playwright'
);
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const out = path.resolve('artifacts/p10a');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.P10A_WEB_URL || 'http://127.0.0.1:5197/');
  await page.getByText('Modo DEV', { exact: true }).click();
  await page.getByRole('button', { name: 'Crear prueba DEV', exact: true }).click();
  await page
    .getByRole('button', { name: 'Referencia P10A · cuatro personajes', exact: true })
    .click();
  await page.getByRole('button', { name: 'DEV · Plegar herramientas', exact: true }).click();
  await page.waitForTimeout(700);
  const metrics = [];
  for (const [width, height] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const metric = await page.evaluate(() => ({
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
      scrollWidth: globalThis.document.documentElement.scrollWidth,
      scrollHeight: globalThis.document.documentElement.scrollHeight,
      nestedButtons: globalThis.document.querySelectorAll('button button').length,
      cards: [...globalThis.document.querySelectorAll('.shop-offer')].map((e) => {
        const r = e.getBoundingClientRect(),
          band = e.querySelector('.affinity-band'),
          icons = [...band.querySelectorAll('button')];
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          name: e.querySelector('.offer-footer strong')?.textContent,
          loaded: e.querySelector('.splash-art')?.complete,
          visibleIcons: icons.length,
          overflow: icons.at(-1)?.classList.contains('affinity-overflow'),
          fits: icons.every((i) => {
            const b = i.getBoundingClientRect();
            return b.left >= r.left && b.right <= r.right && b.top >= r.top && b.bottom <= r.bottom;
          }),
        };
      }),
    }));
    assert.equal(metric.scrollWidth, width);
    assert.equal(metric.scrollHeight, height);
    assert.equal(metric.nestedButtons, 0);
    assert.equal(metric.cards.length, 5);
    assert.deepEqual(
      metric.cards.map((c) => c.name),
      ['DOLEA', 'VARGAS', 'JARAMILLO', 'FLORIN', 'DOLEA'],
    );
    assert.ok(metric.cards.every((c) => c.loaded && c.fits));
    metrics.push(metric);
    await page.screenshot({ path: `${out}/shop-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);
  const gym = page.locator('.trait-trigger').filter({ hasText: 'Gym' });
  await gym.click();
  await page.screenshot({ path: `${out}/pending-trait-progress.png` });
  await gym.press('Escape');
  const vargas = page.locator('.shop-offer').nth(1),
    overflow = vargas.locator('.affinity-overflow');
  const before = await page.locator('.offer-footer strong').allTextContents();
  await overflow.click();
  await page.getByRole('dialog', { name: 'Afinidades restantes', exact: true }).waitFor();
  assert.match(
    await page.getByRole('dialog', { name: 'Afinidades restantes', exact: true }).innerText(),
    /El Depredador/,
  );
  await page.screenshot({ path: `${out}/overflow-unique.png` });
  await page.keyboard.press('Escape');
  assert.equal(await overflow.evaluate((e) => e === globalThis.document.activeElement), true);
  assert.deepEqual(await page.locator('.offer-footer strong').allTextContents(), before);
  const icon = page.locator('.shop-offer').nth(3).locator('.affinity-icon').last();
  await icon.focus();
  await page.getByRole('tooltip').filter({ hasText: 'Mano de Obra' }).waitFor();
  await page.screenshot({ path: `${out}/tooltip-florin.png` });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page
    .getByRole('button', { name: 'Comprar JARAMILLO, oferta 3, 2 oro', exact: true })
    .click();
  await page.locator('[data-bench-slot]').nth(0).click();
  const inspector = page.locator('.local-inspector');
  await inspector.waitFor();
  assert.equal(await inspector.locator('.affinity-details details').count(), 7);
  assert.match(await inspector.innerText(), /PSOE/);
  await page.screenshot({ path: `${out}/inspector-all-affinities.png` });
  await inspector.locator('.affinity-details summary').first().click();
  await page.screenshot({ path: `${out}/inspector-jaramillo.png` });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'DEV · Abrir herramientas', exact: true }).click();
  await page.locator('.roster-gallery > summary').click();
  assert.equal(await page.locator('[data-roster-id]').count(), 34);
  const peibol = page.locator('[data-roster-id="peibol"]');
  await peibol.scrollIntoViewIfNeeded();
  assert.match(await peibol.innerText(), /8 afinidades/);
  assert.match(await peibol.innerText(), /Borrador/);
  await page.screenshot({ path: `${out}/roster-drafts.png` });
  await peibol.locator('.affinity-band').evaluate((e) => {
    e.style.width = '130px';
  });
  await page.waitForTimeout(150);
  await peibol.locator('.affinity-overflow').click();
  const popup = page.getByRole('dialog', { name: 'Afinidades restantes', exact: true });
  await popup.waitFor();
  assert.match(await popup.innerText(), /Jew/);
  await page.screenshot({ path: `${out}/eight-affinity-overflow.png` });
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    `${out}/browser-metrics.json`,
    JSON.stringify(
      {
        fixture:
          'DEV P10A, fixed clock, real existing definitions. Width-stress on the Peibol draft gallery only.',
        metrics,
        errors,
        checks: [
          'five splash cards',
          'no document scroll',
          'no nested buttons',
          'overflow reveals unique attribute',
          'keyboard tooltip',
          'Escape returns focus',
          'icon interaction does not purchase',
          'seven inspector affinities',
          '34 gallery records',
          'eight-affinity responsive overflow',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log('P10A browser checks passed at all five required sizes.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
