#!/usr/bin/env node
// Мок-бэкенд «Дом мёда»: node server.js [--port 3000] [--persist] [--quiet]
import { createApp } from './src/app.js';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

const port = Number(opt('port', process.env.PORT || 3000));
const { server, store } = createApp({ persist: flag('persist') || process.env.PERSIST === '1', log: !flag('quiet') });

server.listen(port, () => {
  const { categories, products } = store.catalog;
  console.log(`Дом мёда (mock) → http://localhost:${port}/`);
  console.log(`  каталог: ${categories.length} категорий, ${products.length} товаров`);
  console.log(`  API:     http://localhost:${port}/api/v1/products`);
  console.log(`  отладка: http://localhost:${port}/__mock/state  |  /__mock/routes`);
});
