#!/usr/bin/env python3
"""
Строит тестовые данные мок-бэкенда из локальной копии ./site:
  mock-backend/data/catalog.json  — категории и товары (варианты фасовки, цены, свойства, картинки)
  mock-backend/data/content.json  — контентные страницы и рецепты

Запуск:  python3 -I tools/extract_catalog.py
"""
import json
import os
import posixpath
import re
import sys
import urllib.parse
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # наш tools/, не каталог с зеркалом
from minidom import parse  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = os.path.join(ROOT, "site")
OUT = os.path.join(ROOT, "mock-backend", "data")
OWN_HOSTS = {"www.dommeda.ru", "dommeda.ru"}
CATALOG_ROOTS = ("/katalog-meda", "/pchelovodam")


# ------------------------------------------------------------------ пути/ссылки
def file_to_path(rel):
    """katalog-meda/lipovyj-myod/lipovyj.html -> /katalog-meda/lipovyj-myod/lipovyj;
    pchelovodam@start=20.html -> /pchelovodam?start=20"""
    p = rel[:-5] if rel.endswith(".html") else rel
    if p == "index":
        return "/"
    if p.endswith("/index"):
        p = p[:-6]
    if "@" in p:
        base, q = p.split("@", 1)
        return "/" + base + "?" + q
    return "/" + p


def href_to_path(href, from_rel):
    """Ссылка из HTML зеркала (относительная после wget -k или абсолютная) -> путь сайта."""
    if not href or href.startswith(("#", "javascript:", "tel:", "mailto:")):
        return None
    href = urllib.parse.unquote(href.split("#", 1)[0])
    pu = urllib.parse.urlsplit(href)
    if pu.scheme in ("http", "https"):
        if (pu.hostname or "") not in OWN_HOSTS:
            return None
        path = pu.path.rstrip("/") or "/"
        return path + (("?" + pu.query) if pu.query else "")
    if href.startswith("/"):
        return href.rstrip("/") or "/"
    rel = posixpath.normpath(posixpath.join(posixpath.dirname(from_rel), href))
    if rel.startswith(".."):
        return None
    if rel.endswith(".html"):
        return file_to_path(rel)
    return "/" + rel


def asset_url(src, from_rel):
    """src картинки -> абсолютный путь от корня сайта (/assets/cache/...), как его раздаёт мок."""
    if not src:
        return None
    src = urllib.parse.unquote(src)
    pu = urllib.parse.urlsplit(src)
    if pu.scheme in ("http", "https"):
        return src if (pu.hostname or "") not in OWN_HOSTS else pu.path
    if src.startswith("/"):
        return src
    rel = posixpath.normpath(posixpath.join(posixpath.dirname(from_rel), src))
    return "/" + rel.lstrip("./") if not rel.startswith("..") else "/" + src


def num(s):
    if s is None:
        return None
    s = s.replace("\xa0", "").replace(" ", "").replace(",", ".")
    m = re.search(r"\d+(?:\.\d+)?", s)
    return float(m.group()) if m else None


def int_or_float(x):
    return int(x) if x is not None and float(x).is_integer() else x


def weight_grams(name):
    """'1 килограмм' -> 1000, '500 гр' -> 500, '0,5 кг' -> 500, '3 л' -> None"""
    if not name:
        return None
    s = name.lower().replace(",", ".")
    m = re.search(r"(\d+(?:\.\d+)?)\s*(кг|килограм\w*|г\b|гр\w*|грамм\w*)", s)
    if not m:
        return None
    v = float(m.group(1))
    return int(v * 1000) if m.group(2).startswith("к") else int(v)


def clean(s):
    return " ".join((s or "").replace("\xa0", " ").split())


# ------------------------------------------------------------------ разбор страниц
def breadcrumbs(doc, rel):
    bc = doc.find("div", cls="breadcrumbs")
    out = []
    if not bc:
        return out
    for el in bc.find_all("span", cls="el"):
        a = el.find("a")
        title = el.find("span", itemprop="title")
        out.append({"title": clean(title.text() if title else el.text()),
                    "path": href_to_path(a.get("href"), rel) if a else None})
    return out


def main_block(doc):
    wrap = doc.find("div", id="wrap")
    return wrap.find("div", cls="text") if wrap else None


def page_meta(doc):
    t = doc.find("title")
    d = doc.find("meta", name="description")
    return {"metaTitle": clean(t.text()) if t else None,
            "metaDescription": d.get("content") if d else None}


def parse_listing(doc, rel):
    """Карточки .catalog_list .cel на странице категории."""
    out = []
    lst = doc.find("div", cls="catalog_list")
    if not lst:
        return out
    for cel in lst.find_all("div", cls="cel"):
        a = cel.find("a")
        if not a:
            continue
        price_el = cel.find("div", cls="price")
        img = cel.find("img")
        name = cel.find("div", cls="name")
        desc = cel.find("div", cls="description")
        b = price_el.find_all("b") if price_el else []
        price_text = clean(price_el.text()) if price_el else ""
        unit = None
        m = re.search(r"/\s*(.+)$", price_text)
        if m:
            unit = clean(m.group(1))
        out.append({
            "path": href_to_path(a.get("href"), rel),
            "name": clean(name.text()) if name else None,
            "listPrice": int_or_float(num(b[0].text())) if b else None,
            "listUnit": unit,
            "thumb": asset_url(img.get("src"), rel) if img else None,
            "shortDescriptionHtml": desc.inner_html().strip() if desc else None,
        })
    return out


def parse_props(desc_html):
    """'<b>Аромат:</b> ...<br><b>Вкус:</b> ...' -> {'Аромат': ..., 'Вкус': ...}"""
    out = {}
    if not desc_html:
        return out
    for m in re.finditer(r"<b>\s*([^<:]+):\s*</b>(.*?)(?:<br\s*/?>|$)", desc_html, re.S):
        out[clean(m.group(1))] = clean(re.sub(r"<[^>]+>", "", m.group(2)))
    return out


def parse_product(doc, rel, path):
    text = main_block(doc)
    form = doc.find("form", data_commerce_action="add")
    pid = form.find("input", name="id").get("value")
    h1 = text.find("h1")
    imgblock = text.find("div", cls="imgblock")
    full = medium = None
    gallery = []
    price_text = base_price = None
    if imgblock:
        a = imgblock.find("a", data_fancybox=True)
        if a:
            full = asset_url(a.get("href"), rel)
            im = a.find("img")
            medium = asset_url(im.get("src"), rel) if im else None
        album = imgblock.find("div", cls="inline_album")
        if album:
            for ga in album.find_all("a"):
                gi = ga.find("img")
                gallery.append({"full": asset_url(ga.get("href"), rel),
                                "thumb": asset_url(gi.get("src"), rel) if gi else None})
        pe = imgblock.find("div", cls="price")
        price_text = clean(pe.text()) if pe else None
        # товары без фасовок (раздел «Пчеловодам»): <div class="price" data-commerce-price="2415">
        base_price = int_or_float(num(pe.get("data-commerce-price"))) if pe and pe.get("data-commerce-price") else None

    options, option_type = [], None
    for buy in form.find_all("div", cls="buy"):
        inp = buy.find("input")
        if not inp:
            continue
        m = re.match(r"meta\[(\w+)\]", inp.get("name") or "")
        option_type = m.group(1) if m else option_type
        nm = buy.find("div", cls="name")
        pr = buy.find("div", cls="price")
        icon = buy.find("img")
        oname = clean(nm.text()) if nm else None
        options.append({
            "index": int(inp.get("value")),
            "name": oname,
            "price": int_or_float(num(pr.text())) if pr else None,
            "weightGrams": weight_grams(oname),
            "icon": asset_url(icon.get("src"), rel) if icon else None,
            "default": "checked" in inp.attrs,
        })

    props = []
    table = text.find("table")
    if table:
        for tr in table.find_all("tr"):
            th, td = tr.find("th"), tr.find("td")
            if th and td:
                props.append({"name": clean(th.text()).rstrip(":"), "value": clean(td.text())})

    # Описание: всё между <div class="clr"> и блоком .share
    desc_parts, started = [], False
    for c in text.children:
        if hasattr(c, "tag"):
            if c.tag == "div" and "clr" in c.classes():
                started = True
                continue
            if c.tag == "div" and "share" in c.classes():
                break
        if started:
            desc_parts.append(c if isinstance(c, str) else c.outer_html())
    description = "".join(desc_parts).strip() or None

    related = []
    wrap = doc.find("div", id="wrap")
    for lst in wrap.find_all("div", cls="catalog_list"):
        if lst.closest("div", cls="text") is None:
            for a in lst.find_all("a"):
                p = href_to_path(a.get("href"), rel)
                if p:
                    related.append(p)

    bc = breadcrumbs(doc, rel)
    category_path = posixpath.dirname(path)
    default = next((o for o in options if o["default"]), options[0] if options else None)
    return {
        "id": int(pid),
        "slug": posixpath.basename(path),
        "path": path,
        "categoryPath": category_path,
        "name": clean(h1.text()) if h1 else None,
        **page_meta(doc),
        "price": default["price"] if default else base_price,
        "priceText": price_text,
        "optionType": option_type,
        "options": options,
        "image": {"full": full, "medium": medium, "thumb": None},
        "gallery": gallery,
        "properties": props,
        "descriptionHtml": description,
        "relatedPaths": related,
        "breadcrumbs": bc,
        "available": bool(options) or base_price is not None,
    }


def parse_category(doc, rel, path):
    text = main_block(doc)
    h1 = text.find("h1")
    desc = text.find("div", cls="category_description")
    bc = breadcrumbs(doc, rel)
    title = bc[-1]["title"] if bc else (clean(h1.text()) if h1 else None)
    parent = None
    for crumb in reversed(bc[:-1]):
        if crumb["path"] and crumb["path"] != "/":
            parent = crumb["path"]
            break
    return {
        "path": path,
        "slug": posixpath.basename(path),
        "parentPath": parent if parent != path else None,
        "title": title,
        "h1": clean(h1.text()) if h1 else None,
        **page_meta(doc),
        "descriptionHtml": desc.inner_html().strip() if desc else None,
    }


def parse_content(doc, rel, path):
    text = main_block(doc)
    if text is None:
        return None
    h1 = text.find("h1")
    parts = []
    for c in text.children:
        if hasattr(c, "tag") and (("breadcrumbs" in c.classes()) or ("sotheader" in c.classes())):
            continue
        parts.append(c if isinstance(c, str) else c.outer_html())
    img = text.find("img")
    return {
        "path": path,
        "slug": posixpath.basename(path) or "index",
        "title": clean(h1.text()) if h1 else None,
        **page_meta(doc),
        "breadcrumbs": breadcrumbs(doc, rel),
        "image": asset_url(img.get("src"), rel) if img else None,
        "html": "".join(parts).strip(),
    }


# ------------------------------------------------------------------ main
def main():
    files = sorted(
        os.path.relpath(os.path.join(dp, fn), SITE).replace(os.sep, "/")
        for dp, dns, fns in os.walk(SITE) for fn in fns
        if fn.endswith(".html") and not dp.startswith(os.path.join(SITE, "_ext")))

    products, categories, listings, pages = {}, {}, {}, []
    for rel in files:
        html = open(os.path.join(SITE, rel), encoding="utf-8", errors="replace").read()
        if 'id="wrap"' not in html:
            continue
        doc = parse(html)
        path = file_to_path(rel)
        page_rel = rel
        # пока wget не переписал ссылки (-k), относительные пути считаются от <base href="/">
        base = doc.find("base")
        if base is not None and base.get("href") == "/":
            rel = "index.html"
        base_path = path.split("?")[0]
        is_catalog = base_path.startswith(CATALOG_ROOTS)

        if doc.find("form", data_commerce_action="add") and doc.find("div", cls="imgblock"):
            p = parse_product(doc, rel, base_path)
            products[p["path"]] = p
        elif is_catalog and doc.find("div", cls="catalog_list"):
            if "?" not in path:
                categories[base_path] = parse_category(doc, rel, base_path)
            for i, item in enumerate(parse_listing(doc, rel)):
                if item["path"]:
                    item.setdefault("_order", (base_path, path, i))
                    listings.setdefault(item["path"], []).append({**item, "listedIn": base_path})
        elif "?" not in path and base_path not in ("/basket", "/404"):
            c = parse_content(doc, rel, base_path)
            if c:
                pages.append(c)

    # «Товар», под которым лежат другие товары, — на самом деле категория, оформленная шаблоном
    # товара (на живом сайте: /pchelovodam/medogonki/medogonki-2-ramochnye — без цены, с кнопкой «В корзину»)
    for pth in [p for p in products if any(o.startswith(p + "/") for o in products)]:
        p = products.pop(pth)
        categories.setdefault(pth, {
            "path": pth, "slug": p["slug"], "parentPath": p["categoryPath"], "title": p["name"], "h1": p["name"],
            "metaTitle": p["metaTitle"], "metaDescription": p["metaDescription"],
            "descriptionHtml": p["descriptionHtml"], "brokenTemplate": "product",
        })
        print(f"как категория (шаблон товара на сайте): {pth} (id={p['id']})")

    # категории: id, родитель, порядок
    cat_list = sorted(categories.values(), key=lambda c: c["path"])
    ids = {c["path"]: i + 1 for i, c in enumerate(cat_list)}
    for c in cat_list:
        c["id"] = ids[c["path"]]
        parent = c.pop("parentPath")
        if not parent:  # нет крошек — родитель по URL
            up = posixpath.dirname(c["path"])
            parent = up if up in ids else None
        c["parentId"] = ids.get(parent)

    # товары: обогащаем данными из листингов, проставляем категорию и порядок
    for pth, p in products.items():
        lst = listings.get(pth, [])
        own = next((x for x in lst if x["listedIn"] == p["categoryPath"]), lst[0] if lst else None)
        if own:
            p["cardName"] = own["name"]  # короткое имя с витрины («Липовый»), name — это H1 со SEO-хвостом
            p["image"]["thumb"] = own["thumb"]
            p["shortDescriptionHtml"] = own["shortDescriptionHtml"]
            p["listPrice"] = own["listPrice"]
            p["listUnit"] = own["listUnit"]
            p["attributes"] = parse_props(own["shortDescriptionHtml"])
        cat = categories.get(p["categoryPath"])
        p["categoryId"] = cat["id"] if cat else None
        p["categoryIds"] = sorted({categories[x["listedIn"]]["id"] for x in lst if x["listedIn"] in categories}
                                  | ({cat["id"]} if cat else set()))
        if p["price"] is None and p.get("listPrice"):
            p["price"] = p["listPrice"]

    path_to_id = {p["path"]: p["id"] for p in products.values()}
    for p in products.values():
        p["relatedIds"] = [path_to_id[x] for x in p.pop("relatedPaths") if x in path_to_id]
        p.pop("breadcrumbs", None)

    # порядок товаров внутри собственной категории — как в листинге «по значимости»
    order = {}
    for pth, lst in listings.items():
        for x in lst:
            if x["listedIn"] == posixpath.dirname(pth):
                _, page_path, i = x["_order"]
                m = re.search(r"start=(\d+)", page_path)
                order[pth] = (int(m.group(1)) if m else 0) + i
    for p in products.values():
        p["menuIndex"] = order.get(p["path"], 9999)

    recipes = [pg for pg in pages if pg["path"].startswith("/recepty-s-medom/")]
    pages = [pg for pg in pages if not pg["path"].startswith("/recepty-s-medom/")]
    for i, r in enumerate(recipes, 1):
        r["id"] = i

    os.makedirs(OUT, exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    prods = sorted(products.values(), key=lambda p: (p["categoryPath"], p["menuIndex"], p["id"]))
    with open(os.path.join(OUT, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": stamp, "source": "site/ (wget mirror of www.dommeda.ru)",
                   "categories": cat_list, "products": prods}, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT, "content.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": stamp, "pages": pages, "recipes": recipes}, f, ensure_ascii=False, indent=2)

    no_opts = [p["path"] for p in prods if not p["options"]]
    print(f"categories: {len(cat_list)}, products: {len(prods)} (без вариантов: {len(no_opts)}), "
          f"pages: {len(pages)}, recipes: {len(recipes)}")
    unlisted = [p["path"] for p in prods if p["menuIndex"] == 9999]
    if unlisted:
        print(f"товаров, не найденных в листинге своей категории: {len(unlisted)}")


if __name__ == "__main__":
    main()
