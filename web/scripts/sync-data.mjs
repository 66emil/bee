#!/usr/bin/env node
// Готовит данные и медиа прототипа из локальной копии сайта и мок-бэкенда:
//   ../mock-backend/data/*.json  ->  data/*.json   (нормализованный каталог, страницы, настройки)
//   ../site/**                   ->  public/media/**  (фото товаров в WebP 480/960, фото магазина, логотип)
// Запуск: npm run sync-data
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '..');
const ROOT = path.resolve(WEB, '..');
const SITE = path.join(ROOT, 'site');
const SRC = path.join(ROOT, 'mock-backend', 'data');
const OUT = path.join(WEB, 'data');
const PUB = path.join(WEB, 'public');
const WIDTHS = [480, 960];
// Точка фокуса при кадрировании (object-position). Студийная серия: банка правее центра, вывеска слева вверху.
const STUDIO = new Set([466, 471, 452, 482, 486, 454, 468, 475, 445, 641]);
const FOCUS = { 639: '28% 55%' };
const focusFor = (id) => FOCUS[id] ?? (STUDIO.has(id) ? '100% 55%' : '50% 50%');

const readJson = async (f) => JSON.parse(await readFile(f, 'utf8'));

// ------------------------------------------------------------------ HTML
const OLD_LINKS = { '/catalog/honey-11': '/katalog-meda', '/catalog/pchelovodam-2': '/pchelovodam' };

/** Ссылка из зеркала (относительная к файлу или абсолютная на dommeda.ru) -> путь нового сайта */
function mapHref(href, fromFile) {
  if (!href) return null;
  if (/^(tel:|mailto:|#)/.test(href)) return href;
  if (href.startsWith('emailto:')) return 'mailto:' + href.slice(8);
  let p;
  const abs = href.match(/^https?:\/\/(?:www\.)?dommeda\.ru(\/[^?#]*)?/i);
  if (abs) p = abs[1] || '/';
  else if (/^https?:\/\//.test(href)) return href; // внешняя ссылка
  else if (href.startsWith('/')) p = href;
  else p = '/' + path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), href));
  p = decodeURI(p).replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  if (p.startsWith('/catalog/')) p = OLD_LINKS[p] || '/katalog-meda';
  if (p === '/politika_konfidencialnosti') p = '/politika-konfidencialnosti';
  return p;
}

function sanitizeHtml(html, fromFile = 'index.html') {
  if (!html) return null;
  let s = html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<(script|style|head|title|noscript)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(html|body|meta|link)\b[^>]*>/gi, '')
    .replace(/<ul class="nav_inline[\s\S]*?<\/ul>/gi, '') // подменю старого сайта
    .replace(/<a\b[^>]*data-fancybox[^>]*>[\s\S]*?<\/a>/gi, '') // галереи-картинки — в шаблонах
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/\s(?:class|style|id|data-[\w-]+|itemprop|itemscope|itemtype|rel)="[^"]*"/gi, '')
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>/gi, (_, href) => {
      const to = mapHref(href, fromFile);
      const ext = to && /^https?:/.test(to);
      return to ? `<a href="${to}"${ext ? ' target="_blank" rel="noopener"' : ''}>` : '<a>';
    })
    .replace(/<span>\s*<\/span>/gi, '')
    .replace(/<(p|div)>(?:\s|&nbsp;| )*<\/\1>/gi, '')
    .replace(/<div>([\s\S]*?)<\/div>/gi, '<p>$1</p>')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
  return s || null;
}

const textOf = (html) => (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------ images
async function isCutout(file) {
  // Предметное фото на белом фоне? Смотрим на углы.
  const img = sharp(file).flatten({ background: '#ffffff' });
  const { width, height } = await img.metadata();
  const s = Math.max(6, Math.round(Math.min(width, height) * 0.04));
  const corners = [[0, 0], [width - s, 0], [0, height - s], [width - s, height - s]];
  for (const [left, top] of corners) {
    // stats() считается по входу конвейера, а не по результату — поэтому через буфер
    const buf = await sharp(file).flatten({ background: '#ffffff' }).extract({ left, top, width: s, height: s }).toBuffer();
    const { channels } = await sharp(buf).stats();
    const mean = channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
    const dev = channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
    if (mean < 236 || dev > 10) return false;
  }
  return true;
}

const done = new Map();
async function processImage(srcRel, outBase) {
  if (!srcRel) return null;
  if (done.has(srcRel)) return done.get(srcRel);
  const file = path.join(SITE, decodeURIComponent(srcRel).replace(/^\/+/, ''));
  if (!existsSync(file)) return null;
  const cutout = await isCutout(file);
  // Предметные фото: обрезаем белые поля и даём одинаковый небольшой отступ,
  // чтобы предметы в карточках были одного масштаба (принцип 2).
  let base = await sharp(file).flatten({ background: '#ffffff' }).png().toBuffer();
  if (cutout) {
    const trimmed = await sharp(base).trim({ threshold: 18 }).png().toBuffer().catch(() => base);
    const m = await sharp(trimmed).metadata();
    const pad = Math.round(Math.max(m.width, m.height) * 0.04);
    base = await sharp(trimmed).extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' }).png().toBuffer();
  }
  const meta = await sharp(base).metadata();
  const widths = WIDTHS.filter((w) => w <= meta.width);
  if (!widths.length) widths.push(meta.width);
  await mkdir(path.dirname(path.join(PUB, outBase)), { recursive: true });
  for (const w of widths) {
    await sharp(base)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(PUB, `${outBase}-${w}.webp`));
  }
  const info = { src: '/' + outBase, widths, w: meta.width, h: meta.height, cutout };
  done.set(srcRel, info);
  return info;
}

// ------------------------------------------------------------------ main
async function main() {
  const [catalog, content, settings, fixtures] = await Promise.all(
    ['catalog.json', 'content.json', 'settings.json', 'fixtures.json'].map((f) => readJson(path.join(SRC, f))),
  );
  await rm(path.join(PUB, 'media'), { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // --- товары
  const products = [];
  for (const p of catalog.products) {
    const fileRel = p.path.slice(1) + '.html';
    const images = [];
    const main = await processImage(p.image.full || p.image.medium || p.image.thumb, `media/p/${p.id}/0`);
    if (main) images.push({ ...main, focus: main.cutout ? null : focusFor(p.id) });
    let n = 1;
    for (const g of p.gallery || []) {
      const gi = await processImage(g.full || g.thumb, `media/p/${p.id}/${n++}`);
      if (gi) images.push(gi);
    }
    const prop = Object.fromEntries((p.properties || []).map((x) => [x.name, x.value]));
    const attrs = p.attributes || {};
    const short = p.shortDescriptionHtml && !/<b>/.test(p.shortDescriptionHtml) ? textOf(p.shortDescriptionHtml) : null;
    products.push({
      id: p.id,
      slug: p.slug,
      path: p.path,
      root: p.path.startsWith('/pchelovodam') ? 'bee' : 'honey',
      categoryId: p.categoryId,
      categoryIds: p.categoryIds,
      name: (p.cardName || p.name).replace(/\s+/g, ' ').trim(),
      title: p.name,
      metaDescription: p.metaDescription || null,
      price: p.price,
      priceUnit: p.listUnit || null,
      optionType: p.optionType,
      options: (p.options || []).map((o) => ({ index: o.index, label: o.name, grams: o.weightGrams, price: o.price })),
      images,
      sort: prop['Сорт'] || null,
      structure: prop['Структура'] || null,
      aroma: prop['Аромат'] || attrs['Аромат'] || null,
      taste: prop['Вкус'] || attrs['Вкус'] || null,
      short,
      descriptionHtml: sanitizeHtml(p.descriptionHtml, fileRel),
      relatedIds: p.relatedIds || [],
      menuIndex: p.menuIndex,
      available: p.available !== false && p.price != null,
    });
  }

  // служебный товар «пакет» (предлагается в корзине)
  for (const x of fixtures.extraProducts || []) {
    products.push({
      id: x.id, slug: x.slug, path: x.path, root: 'service', categoryId: null, categoryIds: [],
      name: x.name.replace(/\s*42\+25х70/, ''), title: x.name, metaDescription: null, price: x.price, priceUnit: null,
      optionType: null, options: [], images: [], sort: null, structure: null, aroma: null, taste: null, short: null,
      descriptionHtml: null, relatedIds: [], menuIndex: 9999, available: true, hidden: true,
    });
  }

  // --- категории
  const categories = catalog.categories.map((c) => ({
    id: c.id,
    path: c.path,
    slug: c.slug,
    parentId: c.parentId,
    root: c.path.startsWith('/pchelovodam') ? 'bee' : 'honey',
    title: c.title.replace(/\s*-\s*купить в Москве$/i, '').trim(),
    h1: c.h1,
    metaDescription: c.metaDescription || null,
    descriptionHtml: sanitizeHtml(c.descriptionHtml, c.path.slice(1) + '.html'),
  }));

  // --- страницы
  const pages = content.pages.map((p) => ({
    path: p.path,
    title: p.title,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    html: sanitizeHtml(p.html, (p.path === '/' ? 'index' : p.path.slice(1)) + '.html'),
  }));

  // --- фото магазина (страница «О нас»)
  const shop = {};
  for (const [key, f] of [['tasting', 'images/u/1410/2-1(2).jpg'], ['stand', 'images/u/1410/10-1(1).jpg'], ['hall', 'images/u/1410/1-1(1).jpg'], ['counter', 'images/u/1410/6-1.jpg']]) {
    shop[key] = await processImage(f, `media/shop/${key}`);
  }

  // --- логотип: эмблема и надпись из logo.png (273×215, прозрачный фон)
  await mkdir(path.join(PUB, 'brand'), { recursive: true });
  const logo = path.join(SITE, 'images', 'logo.png');
  // trim в sharp выполняется раньше extract, поэтому — два прохода
  const crop = async (area, out) =>
    sharp(await sharp(logo).extract(area).png().toBuffer()).trim().png().toFile(path.join(PUB, 'brand', out));
  await crop({ left: 0, top: 0, width: 273, height: 128 }, 'emblem.png');
  await crop({ left: 0, top: 128, width: 273, height: 87 }, 'wordmark.png');
  await sharp(path.join(PUB, 'brand', 'emblem.png'))
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png()
    .toFile(path.join(WEB, 'app', 'icon.png'));

  const pub = { ...settings };
  for (const k of Object.keys(pub)) if (k.startsWith('_') || k === 'cartWidgets') delete pub[k];

  await writeFile(path.join(OUT, 'catalog.json'), JSON.stringify({ categories, products }, null, 1));
  await writeFile(path.join(OUT, 'content.json'), JSON.stringify({ pages, shop }, null, 1));
  await writeFile(path.join(OUT, 'settings.json'), JSON.stringify(pub, null, 1));

  const cut = products.filter((p) => p.images[0]?.cutout).length;
  console.log(`products: ${products.length} (с фото: ${products.filter((p) => p.images.length).length}, на белом фоне: ${cut})`);
  console.log(`categories: ${categories.length}, pages: ${pages.length}, images: ${done.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
