import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { HOME_META } from './home-metadata.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['scripts/serve.mjs'], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server did not start')), 10000);
    server.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Preview server exited: ${code}`)); });
  });
  browser = await chromium.launch({ headless: true });
  await mkdir('qa-output', { recursive: true });
  for (const width of [320, 390, 760, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const response = await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, 'Preview homepage must be served successfully');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `qa-output/home-${width}.png` });
    assert.equal(await page.title(), HOME_META.title);
    assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), HOME_META.description);
    for (const enlarged of [false, true]) {
      if (enlarged) await page.locator('.masthead-copy h1, .masthead-copy .eyebrow, .masthead-deck, .masthead-actions a').evaluateAll(nodes => {
        for (const node of nodes) node.style.fontSize = `${parseFloat(getComputedStyle(node).fontSize) * 2}px`;
      });
      const boxes = await page.evaluate(() => {
        const box = selector => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        };
        return { hero: box('.ember-masthead'), heading: box('#ember-title'), actions: box('.masthead-actions'), primary: box('.masthead-actions .button'), secondary: box('.masthead-secondary'), bottom: box('.masthead-bottom') };
      });
      for (const name of ['heading', 'actions', 'primary', 'secondary', 'bottom']) {
        const b = boxes[name];
        assert.ok(b.left >= -1 && b.right <= width + 1, `${width}px enlarged=${enlarged}: ${name} exceeds viewport`);
        assert.ok(b.top >= boxes.hero.top && b.bottom <= boxes.hero.bottom + 1, `${width}px enlarged=${enlarged}: ${name} clipped by hero`);
      }
      assert.ok(boxes.actions.bottom <= boxes.bottom.top + 1, `${width}px enlarged=${enlarged}: actions overlap bottom navigation`);
    }
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `qa-output/home-${width}.png` });
    const summary = page.locator('.home-faq summary').first();
    await summary.focus();
    await summary.press('Enter');
    assert.equal(await page.locator('.home-faq details').first().getAttribute('open'), '');
    assert.ok(await page.locator('.home-faq details p').first().isVisible());
    await page.locator('.home-faq').screenshot({ path: `qa-output/faq-${width}.png` });
    console.log(`PASS: ${width}px normal/enlarged masthead, navigation separation, metadata and keyboard FAQ`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
