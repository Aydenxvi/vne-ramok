'use strict';
/*
 * VNE RAMOK — reproducible screenshot capture for the README / case study.
 *
 * Usage:
 *   1. npm start                                   (in one terminal)
 *   2. node tools/capture-screenshots.js            (in another terminal)
 *
 * Writes PNGs to docs/screenshots/. Requires Playwright, which is already
 * used by this project's own browser smoke tests — install it once with
 * `npm install --no-save playwright` if it isn't already available in your
 * environment, then run `npx playwright install chromium` if Chromium isn't
 * already downloaded.
 *
 * Admin-panel screenshots are optional and only captured when ADMIN_EMAIL
 * and ADMIN_PASSWORD are set in the environment, pointing at an account
 * created with `npm run admin:setup`. Every other screenshot works against
 * a stock checkout of the demo catalog, so this script is safe to run
 * against a fresh clone with no setup beyond `npm start`.
 *
 * Sections are revealed with a ~1s blur/fade-in transition (see motion.css),
 * so this script scrolls each one to the top of the viewport (not the
 * center — a mid-section scroll can land between two reveal targets) and
 * waits out the full transition before capturing, instead of guessing a
 * short fixed delay.
 */
const path = require('node:path');
const BASE = process.env.VNE_BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };
const REVEAL_SETTLE_MS = 1600;

async function main() {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium');
    process.exitCode = 1;
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  const shot = async (name, opts) => {
    await page.screenshot({ path: path.join(OUT, name + '.png'), ...opts });
    console.log('saved', name + '.png');
  };
  const scrollToTopOf = async (id, offset = 20) => {
    await page.evaluate(({ id, offset }) => {
      const el = document.getElementById(id);
      if (!el) return;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + offset);
    }, { id, offset });
    await page.waitForTimeout(REVEAL_SETTLE_MS);
  };

  // 1. Hero / home
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shot('01-hero');

  // 2. New Drop shuffle carousel
  await scrollToTopOf('drop');
  await shot('02-new-drop');

  // 3. Product detail dialog
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.click('.product-open');
  await page.waitForTimeout(400);
  await shot('03-product-detail');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. Lookbook
  await scrollToTopOf('lookbook');
  await shot('04-lookbook');

  // 5. Outfit Studio
  await scrollToTopOf('outfit');
  await shot('05-outfit-studio');

  // 6. Cart drawer, with a couple of items in it so it isn't an empty state
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await page.click('.product-open');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.sizes button[data-size]')?.click());
  await page.waitForTimeout(150);
  await page.click('#add-cart');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll('.product-open')[2]?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.sizes button[data-size]')?.click());
  await page.waitForTimeout(150);
  await page.click('#add-cart');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.click('#cart-open');
  await page.waitForTimeout(400);
  await shot('06-cart-drawer');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 7. Mobile hero (re-run at phone width, fresh load so the cart above doesn't bleed in)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await shot('07-mobile-hero');
  await page.setViewportSize(VIEWPORT);

  // 8. Admin dashboard (optional, needs real credentials)
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await page.goto(BASE + '/admin.html', { waitUntil: 'networkidle' });
    await page.fill('#admin-login input[name=email]', process.env.ADMIN_EMAIL);
    await page.fill('#admin-login input[name=password]', process.env.ADMIN_PASSWORD);
    await page.click('#admin-login button[type=submit]');
    await page.waitForSelector('#admin-workspace:not([hidden])', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    await shot('08-admin-dashboard');
  } else {
    console.log('skipped 08-admin-dashboard.png (set ADMIN_EMAIL and ADMIN_PASSWORD to capture it)');
  }

  await browser.close();
  console.log('Done. Screenshots written to', OUT);
}

main();
