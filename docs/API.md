# dommeda.ru: структура данных и маршруты

Документ восстановлен по **публичному поведению** сайта: HTML-страницам, `js/script.js`,
`assets/plugins/commerce/js/commerce.js` и формам. Всё, что не удалось наблюдать напрямую,
помечено **⚠️ предположение**; это проверяется по HAR (раздел в конце).

## 1. Платформа

| что | значение |
|---|---|
| CMS | Evolution CMS (fork MODX Evolution), `robots.txt` — «Default Evolution CMS exclusions» |
| Сервер | Apache 2.4.46, PHP 7.4.24 |
| Магазин | плагин **Commerce** 0.12.1 (`/assets/plugins/commerce/js/commerce.js`), списки — DocLister, формы — FormLister |
| Фронт | jQuery 3.6.3, Fancybox, Яндекс.Поделиться (`yastatic.net/share`), Яндекс.Карты (конструктор), Метрика 87671777 |
| Сессия | cookie `evodpn31f` (PHP session), корзина хранится в сессии |
| Хосты | `www.dommeda.ru` и `dommeda.ru` оба отдают 200 (нет редиректа и canonical), в крошках абсолютные ссылки на `https://dommeda.ru/` |

## 2. Карта страниц (URL)

| шаблон URL | что | пример |
|---|---|---|
| `/` | главная: слайдер сортов, блок акций (вставлен целый HTML-документ), 3 товара в шапке | |
| `/katalog-meda` | корень каталога мёда (листинг всех товаров) | |
| `/katalog-meda/:category` | категория-сорт | `/katalog-meda/lipovyj-myod` |
| `/katalog-meda/:category/:product` | товар | `/katalog-meda/lipovyj-myod/lipovyj` |
| `/pchelovodam`, `/pchelovodam/:category`, `/pchelovodam/:category/:product` | инвентарь для пчеловодов | `/pchelovodam/dymari/…` |
| `…?start=20` | пагинация по 20 | `/pchelovodam?start=40` |
| `…?display=40\|60` | товаров на странице | |
| `…?sort=menuindexAsc\|priceAsc\|priceDesc\|nameAsc\|nameDesc` | сортировка | |
| `/search?search=…` | поиск (GET-форма в шапке) | |
| `/basket` | корзина и оформление заказа | |
| `/about`, `/about/oplata_i_dostavka`, `/contacts`, `/dogovor-oferty`, `/politika-konfidencialnosti` | контент | |
| `/recepty-s-medom`, `/museum` | **404 на живом сайте**, хотя они есть в главном меню | |
| `/catalog/…`, `/politika_konfidencialnosti/` | старые ссылки внутри текстов, тоже **404** | |

**Редиректы** (из `logs/wget.log`, повторены в моке через `mock-backend/data/redirects.json`). Цель — хост **без www**:
`/catalog/honey-11/` → `/katalog-meda`, `/contacts/` → `/contacts`, `/about/oplata_i_dostavka/` → `/about/oplata_i_dostavka` (все 301).
При переезде на новую версию их нужно сохранить.

**Найденные проблемы контента** (стоит передать заказчику):
* «Рецепты с медом» и «Музей» есть в главном меню и в футере, но отдают 404;
* крошка «Каталог меда» в разделе мёда ведёт на старый `/catalog/honey-11/` (лишний 301);
* `/pchelovodam/medogonki/medogonki-2-ramochnye` — подкатегория, оформленная шаблоном товара: пустая цена и кнопка «В корзину» (id 625);
* у 12 товаров нет картинки (например, «Мед с имбирем»);
* `css/style.css` ссылается на 5 картинок `/assets/libext/shadowbox/*`, которых нет на сервере (404);
* сайт доступен и с www, и без него, без canonical — дубли для поисковиков.

## 3. Модель данных

Схема ниже — та, что отдаёт мок-API. Поля взяты из разметки сайта (в скобках указан источник).

### Category
```jsonc
{
  "id": 10,                          // порядковый id в моке (настоящий doc id Evo не виден)
  "parentId": 1,                     // null у корней: /katalog-meda, /pchelovodam
  "path": "/katalog-meda/lipovyj-myod",
  "slug": "lipovyj-myod",
  "title": "Липовый мёд",            // пункт меню / последняя крошка
  "h1": "Натуральный липовый мед",
  "metaTitle": "…", "metaDescription": "…",
  "descriptionHtml": "<p>…</p>"      // .category_description
}
```

### Product
```jsonc
{
  "id": 442,                          // <input name="id"> в форме «В корзину» — настоящий id
  "slug": "lipovyj",
  "path": "/katalog-meda/lipovyj-myod/lipovyj",
  "categoryId": 10, "categoryIds": [1, 10],  // основная категория + где ещё выводится в листинге
  "name": "Липовый",
  "price": 3155,                      // цена варианта по умолчанию или data-commerce-price
  "priceText": "308,00 р. за 100 г",  // .imgblock .price (как есть)
  "listPrice": 3155, "listUnit": "1000г",    // цена в листинге: «3155 р. / 1000г»
  "optionType": "addon",              // "addon" | "variant" | null — имя поля meta[...] в форме
  "options": [                        // радиокнопки .buy-btns .buy
    { "index": 0, "name": "1 килограмм", "price": 3155, "weightGrams": 1000, "icon": "/images/u/ves/500.png", "default": true },
    { "index": 1, "name": "500 гр", "price": 1615, "weightGrams": 500 },
    { "index": 2, "name": "250 гр", "price": 803,  "weightGrams": 250 }
  ],
  "image": { "full": "/images/u/dcatalog/1507/img3102.jpg", "medium": "…-350x232-….jpg", "thumb": "…-196x130-….jpg" },
  "gallery": [{ "full": "…", "thumb": "…" }],         // .inline_album
  "properties": [{ "name": "Сорт", "value": "Липовый" }, { "name": "Структура", "value": "…" }, { "name": "Аромат", "value": "…" }, { "name": "Вкус", "value": "…" }],
  "attributes": { "Аромат": "…", "Вкус": "…" },       // из краткого описания в листинге
  "shortDescriptionHtml": "<b>Аромат:</b> …",
  "descriptionHtml": "<p>…</p>",
  "relatedIds": [452, 484],                           // «Вас также могут заинтересовать»
  "menuIndex": 0,                                     // порядок «по значимости»
  "available": true                                   // есть форма «В корзину» с ценой
}
```
Есть три вида товаров:
* **мёд на развес**: `optionType: "addon"`, 1–3 фасовки с разной ценой;
* **фасованный** («Румела»): `optionType: "variant"`, один вариант;
* **инвентарь** (`/pchelovodam`): без вариантов, цена в `data-commerce-price`, в корзину уходит без `meta`.

Плюс служебный товар **611** «Пакет-майка "Дом меда"» (15 ₽): в каталоге его нет, он предлагается радиокнопкой на странице корзины.

### Cart (Commerce, хранится в сессии)
```jsonc
{
  "instance": "products",
  "items": [{
    "row": "5f1c…",                 // md5(id + meta): тот же товар в другой фасовке — другая строка
    "id": 442, "name": "Липовый", "path": "…", "image": "…",
    "option": { "index": 1, "name": "500 гр" }, "meta": { "addon": 1 },
    "price": 1615, "count": 2, "total": 3230
  }],
  "count": 2, "positions": 1, "total": 3230
}
```

### Order ⚠️ поля формы — предположение (форма видна только с непустой корзиной)
```jsonc
{
  "id": 1004, "createdAt": "…", "status": "new|processing|delivered|canceled", "source": "site|api",
  "customer": { "name": "…", "phone": "…", "email": "…|null" },
  "delivery": { "method": "courier|courier_outside|pickup", "title": "…", "address": "…|null", "price": 350 },
  "payment":  { "method": "cash|card_courier|online", "title": "…" } | null,   // при самовывозе блок оплаты скрыт
  "comment": "…",
  "items": [{ "productId": 442, "name": "…", "option": {…}, "price": 1615, "count": 2, "total": 3230 }],
  "subtotal": 3230, "deliveryPrice": 350, "total": 3580, "currency": "RUB"
}
```
Правила из `js/script.js`: `#deliv1` показывает оплаты `#pay1..3` и адрес; `#deliv2` показывает `#pay1,#pay2` (без pay3) и адрес;
`#deliv3` скрывает блок оплаты и адрес, то есть это самовывоз. Доставка «от 350 ₽», только по Москве в пределах МКАД (страница «Условия заказа»).

### CallbackRequest (форма «Обратный звонок», `#cta_form`)
`name*`, `phone*` (+ скрытое `formid=cta_form`).

### Feedback (`#fb_form` на `/contacts`)
`name*`, `email`, `phone`, `message*` (+ `formid=fb_form`).

### Site settings
Телефоны, e-mail, адрес, часы работы, соцсети, юрлицо, меню, способы доставки и оплаты — `mock-backend/data/settings.json`.

## 4. Маршруты живого сайта (легаси), повторены в моке

Все POST-запросы Commerce уходят как `multipart/form-data` (собираются через `objectToFormData`),
ключи в PHP-стиле: `data[meta][addon]=1`, `hashes[carts][0]=…`.

| метод и путь | тело | ответ |
|---|---|---|
| `POST /commerce/action` | `action` = `cart/add` \| `cart/addmultiple` \| `cart/update` \| `cart/remove` \| `cart/clean`; `data` = `{id, count, meta:{addon\|variant}, cart:{instance, hash}}` или `{row, attributes:{count}}`; `hashes` = `{carts:[…], form?}` | `{"status":"success","markup":{"carts":{"<hash>":"<html>"},"form":{"delivery":"…","payments":"…"}}}` |
| `POST /commerce/cart/contents` | `hashes`, `order_completed` | то же, `markup` |
| `POST /commerce/data/update` | поля формы заказа + `hashes` | `{"status":"success","markup":…}` |
| `POST /commerce/currency/set` | `code` | `{"status":"success"}` |
| `POST /ajax.php?q=cta` | urlencoded: `formid=cta_form&name&phone` | `ok` или HTML формы с ошибками (подменяет `#step1_fdb`) |
| `POST /ajax.php?q=fb` | urlencoded: `formid=fb_form&name&email&phone&message` | `ok` или HTML формы (подменяет `#form_feedback`) |
| `GET /search?search=…` | | HTML-страница |
| `GET /basket` / `POST /basket` | форма заказа ⚠️ | HTML |

**Хеши виджетов корзины** (`data-commerce-cart`) одинаковы на всех страницах:
`618d6fa904a3231e7a50bc6c80c2b30b` — корзина в шапке (десктоп), `fd719af6d03de06a109a106ad39c0cbe` — мобильная.
Commerce в ответ на любое действие возвращает свежий HTML для каждого переданного хеша, `commerce.js` заменяет элементы целиком.
Мок `markup.form` не отдаёт: блоки доставки и оплаты в нём от корзины не зависят, а `js/script.js` привязывает
обработчик `.delivery` один раз при загрузке, и после замены радиокнопок он бы перестал срабатывать.

## 5. REST API v1 (мок для нового фронта)

База `http://localhost:3000/api/v1`. Корзина привязана к cookie `mock_sid`; для фронта на другом порту
CORS открыт (с credentials), запросы делать с `credentials: 'include'`.
Ошибки: `{"error":{"code":"validation_error|not_found|bad_request|conflict","message":"…","fields":{"phone":"…"}}}`.

| метод | путь | описание |
|---|---|---|
| GET | `/site` | настройки сайта: контакты, меню, доставка/оплата |
| GET | `/categories` | плоский список (`?parent=<id>\|root`), с `productCount` |
| GET | `/categories?tree=1` | дерево |
| GET | `/categories/:id` или `/categories/<path>` | категория + `children` + `breadcrumbs` |
| GET | `/products` | `?category=<id\|path>&deep=0\|1&q=&ids=1,2&available=1&minPrice=&maxPrice=&sort=menuindex\|price\|-price\|name\|-name&offset=0&limit=20` → `{items,total,offset,limit}` |
| GET | `/products/:id` | товар целиком + `related` |
| GET | `/products/by-path/<path>` | товар по URL старого сайта |
| GET | `/search?q=` | поиск по названию, описанию и свойствам (`ё` = `е`) |
| GET | `/pages`, `/pages/<path>` | контентные страницы (`about`, `about/oplata_i_dostavka`, `contacts`, …) |
| GET | `/recipes`, `/recipes/:slug` | рецепты (на живом сайте раздел отдаёт 404, поэтому список пуст) |
| GET | `/cart` | корзина |
| POST | `/cart/items` | `{productId, optionIndex?, count?}` → 201 `{row, cart}` |
| PATCH | `/cart/items/:row` | `{count}` (0 = удалить) |
| DELETE | `/cart/items/:row`, `/cart` | удалить строку / очистить |
| GET | `/checkout/options` | способы доставки и оплаты с ограничениями |
| POST | `/orders` | `{customer:{name,phone,email}, delivery:{method,address}, payment:{method}, comment}` → 201 Order; корзина очищается |
| GET | `/orders/:id` | заказ |
| POST | `/callback-requests` | `{name, phone}` |
| POST | `/feedback` | `{name, message, email?, phone?}` |

Служебные маршруты: `GET /__mock/state` (заказы и заявки), `POST /__mock/reset`, `GET /__mock/routes`.

## 6. Что проверить по HAR

| # | что | где в моке |
|---|---|---|
| 1 | Текст и разметка **непустого** виджета корзины в шапке («N товаров на X р.»?) | `render/legacy.js → headerCart()` |
| 2 | Разметка корзины на `/basket` с товарами: хеш блока, строки, кнопки ±, удаление | `basketCart()` |
| 3 | **Форма заказа**: имена полей, `value` способов доставки и оплаты, цены, обязательные поля | `orderForm()`, `settings.json → deliveryMethods/paymentMethods` |
| 4 | Как отправляется заказ: обычный POST формы или Commerce AJAX; ответ: редирект, страница «спасибо», переход на оплату (`redirect-to-payment`, `#payment_request`)? | `routes/legacy.js → POST /basket` |
| 5 | Формат ошибки `/commerce/action` (`status: failed` + что ещё?) | `routes/legacy.js` |
| 6 | HTML, которым FormLister отвечает на ошибки `ajax.php` | `ctaFormWithErrors()`, `fbFormWithErrors()` |
| 7 | Есть ли запросы, которых нет в таблице раздела 4 (онлайн-оплата, доставка, подсказки адреса) | `tools/har_analyze.py` покажет «⚠️ НЕТ В МОКЕ» |
