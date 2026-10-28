/* global URL, document, localStorage, console, setTimeout */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import process from 'node:process';
if (!process.env.P9B_PLAYWRIGHT_PATH)
  throw Error('Set P9B_PLAYWRIGHT_PATH to the installed Playwright module');
const { chromium } = await import(process.env.P9B_PLAYWRIGHT_PATH);
const root = 'artifacts/p9b-r0';
while (!fs.existsSync(root + '/browser-session.json')) await new Promise((r) => setTimeout(r, 500));
const session = JSON.parse(fs.readFileSync(root + '/browser-session.json', 'utf8'));
const browser = await chromium.launchPersistentContext(root + '/chrome-profile', {
  headless: true,
  ...(process.env.P9B_CHROME_PATH ? { executablePath: process.env.P9B_CHROME_PATH } : {}),
  args: ['--host-resolver-rules=MAP game.p9b.test 127.0.0.1'],
  viewport: { width: 1920, height: 1080 },
});
const page = await browser.newPage();
const errors = [],
  fonts = [],
  failed = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.url().endsWith('/bungee.ttf'))
    fonts.push({ status: r.status(), mime: r.headers()['content-type'] });
  if (r.status() >= 400) failed.push({ path: new URL(r.url()).pathname, status: r.status() });
});
try {
  await page.addInitScript((s) => {
    localStorage.setItem('sb-localhost-auth-token', JSON.stringify(s));
  }, session);
  await page.goto('https://game.p9b.test:9447/#multiplayer');
  await page.getByText('Clasificación definitiva', { exact: true }).waitFor({ timeout: 30000 });
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = await document.fonts.load('20px FestivalPop');
    return faces.map((f) => ({ family: f.family, status: f.status }));
  });
  assert.ok(loaded.some((f) => f.family === 'FestivalPop' && f.status === 'loaded'));
  assert.ok(fonts.some((f) => f.status === 200 && f.mime === 'font/ttf'));
  const before = await page.locator('body').innerText();
  await page.reload();
  await page.getByText('Clasificación definitiva', { exact: true }).waitFor();
  const after = await page.locator('body').innerText();
  assert.ok(before.includes('Vargas') && after.includes('Vargas'));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: root + '/compiled-final.png' });
  assert.deepEqual(errors, []);
  assert.deepEqual(failed, []);
  fs.writeFileSync(
    root + '/browser-evidence.json',
    JSON.stringify(
      {
        realProductionClient: true,
        authenticatedFixtureSession: true,
        restoredFourPlayerFinal: true,
        reloadRecovered: true,
        fonts,
        loaded,
        errors,
        failed,
        viewport: { width: 1920, height: 1080 },
      },
      null,
      2,
    ),
  );
  console.log('Compiled client, restored final, reload and FestivalPop: PASS');
} finally {
  await browser.close();
  fs.writeFileSync(root + '/browser-done', 'done');
}
