# dommeda.ru: локальная копия и мок-бэкенд для прототипа

```
site/            зеркало публичной части www.dommeda.ru (HTML, CSS, JS, картинки)
mock-backend/    мок-бэкенд: раздаёт site/ + легаси-эндпоинты сайта + REST API v1 для нового фронта
  data/          catalog.json, content.json (из site/), settings.json, fixtures.json (тестовые заказы/заявки)
tools/           mirror.sh (wget), fix_assets.py (докачка), extract_catalog.py (данные), har_analyze.py (HAR)
docs/API.md      структура данных, маршруты, что сверить по HAR
logs/            wget.log, fix_assets.log, assets_report.json
```

## Запуск

```bash
cd mock-backend
npm start            # http://localhost:3000  (node >= 20, зависимостей нет)
npm test             # тесты API и легаси-эндпоинтов
PERSIST=1 npm start  # сохранять заказы/корзины в data/runtime/state.json между перезапусками
```

Сайт через мок: http://localhost:3000/. Работают корзина, обратный звонок, обратная связь, поиск и оформление заказа.
Заказы и заявки, созданные с сайта, видны на http://localhost:3000/__mock/state.

`site/index.html` открывается и напрямую через `file://`, все ссылки относительные. Корзина и формы
в этом режиме не работают: им нужен сервер.

## Как получена копия

1. `tools/mirror.sh`: wget, один поток, пауза 1.5 с ± random, robots.txt соблюдается; дубли `?sort=`/`?display=` отброшены.
2. `python3 -I tools/fix_assets.py`: докачка того, что wget пропустил (превью в `/assets/cache/images/`
   разрешены robots через `Allow`, но wget этого не понимает; `commerce.js`; внешние скрипты → `site/_ext/<host>/`),
   перевод ссылок на `dommeda.ru` без www в локальные, вырезание Яндекс.Метрики (чтобы локальные визиты
   не попадали в счётчик заказчика). Отчёт: `logs/assets_report.json`.
3. `python3 -I tools/extract_catalog.py`: категории, товары, фасовки, цены, контент → `mock-backend/data/*.json`.

## HAR

```bash
python3 -I tools/har_analyze.py ~/Downloads/dommeda.har --fixtures-dir mock-backend/data/har
# → docs/har-report.md: маршруты, параметры, схемы ответов, что не реализовано в моке
```
Телефоны, e-mail, имена, адреса и cookies в отчёте маскируются.
