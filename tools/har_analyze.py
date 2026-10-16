#!/usr/bin/env python3
"""
Разбор HAR (DevTools → Network → Save all as HAR) для описания API сайта.

  python3 -I tools/har_analyze.py path/to/file.har [--out docs/har-report.md] [--fixtures-dir mock-backend/data/har]

Что получаем:
  * список «динамических» запросов (XHR/fetch/POST/документы), сгруппированных в маршруты
    (числа и slug'и заменяются на :id/:slug), с методами, статусами, типами ответов;
  * параметры: query, поля form-data/urlencoded (PHP-ключи a[b][c] разворачиваются), JSON-ключи;
  * выведенная схема JSON-ответов (типы полей, примеры значений);
  * сравнение с маршрутами мок-бэкенда (что есть в HAR, но не реализовано);
  * (опционально) реальные ответы как фикстуры для мока.

Персональные данные маскируются: cookies/Authorization не выводятся, значения полей
name/phone/email/address/comment/message заменяются на ***.
"""
import argparse
import base64
import json
import os
import re
import sys
import urllib.parse
from collections import OrderedDict, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OWN_HOSTS = {"www.dommeda.ru", "dommeda.ru"}
STATIC_EXT = re.compile(r"\.(css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|otf|map|mp4|webm)$", re.I)
TRACKERS = ("mc.yandex", "yandex.ru/watch", "google-analytics", "googletagmanager", "doubleclick",
            "top-fwz1.mail.ru", "vk.com/rtrg", "facebook.net", "yastatic.net", "api-maps.yandex")
PII_KEYS = re.compile(r"(^|[\[_])(name|phone|tel|email|e-mail|mail|address|addr|comment|message|fio|surname|"
                      r"password|pass|token|card)([\]_]|$)", re.I)
SKIP_HEADERS = {"cookie", "set-cookie", "authorization", "x-csrf-token"}

# Маршруты, которые реализует мок (держать в синхроне с mock-backend/src/routes/*.js)
MOCK_ROUTES = [
    ("POST", "/commerce/action"), ("POST", "/commerce/cart/contents"), ("POST", "/commerce/data/update"),
    ("POST", "/commerce/currency/set"), ("POST", "/ajax.php"), ("GET", "/search"),
    ("GET", "/basket"), ("POST", "/basket"),
]


EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?<![\w\d])(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}(?!\d)")
SITE_PHONES = {"74959511012", "74959514378", "74959511084", "84959511012", "84959514378", "84959511084"}


def mask(key, value):
    if PII_KEYS.search(key or "") and value not in ("", None):
        return "***"
    return value


def mask_json(v, key=""):
    if isinstance(v, dict):
        return OrderedDict((k, mask_json(x, k)) for k, x in v.items())
    if isinstance(v, list):
        return [mask_json(x, key) for x in v]
    if isinstance(v, str):
        return scrub(mask(key, v))
    return mask(key, v) if v is not None else v


def scrub(text):
    """Маскирует e-mail и телефоны в произвольном тексте (кроме телефонов и e-mail самого магазина)."""
    if not isinstance(text, str):
        return text
    text = EMAIL_RE.sub(lambda m: m.group() if m.group().endswith("@dommeda.ru") else "***@***", text)
    return PHONE_RE.sub(lambda m: m.group() if re.sub(r"\D", "", m.group()) in SITE_PHONES else "+7 *** ***-**-**", text)


def php_nest(pairs):
    out = OrderedDict()
    for key, val in pairs:
        m = re.match(r"^([^\[\]]+)((?:\[[^\[\]]*\])*)$", key)
        keys = [m.group(1)] + re.findall(r"\[([^\[\]]*)\]", m.group(2)) if m else [key]
        node = out
        for i, k in enumerate(keys):
            if k == "":
                k = str(len(node))
            if i == len(keys) - 1:
                node[k] = mask(key, val)
            else:
                node = node.setdefault(k, OrderedDict())
                if not isinstance(node, dict):
                    break
    return out


def route_template(path):
    segs = []
    for s in path.split("/"):
        if re.fullmatch(r"\d+", s):
            segs.append(":id")
        elif re.fullmatch(r"[0-9a-f]{16,}", s):
            segs.append(":hash")
        else:
            segs.append(s)
    return "/".join(segs) or "/"


def page_template(path):
    """Документы каталога группируем по глубине: /katalog-meda/:slug/:slug"""
    parts = [p for p in path.split("/") if p]
    if len(parts) >= 2 and parts[0] in ("katalog-meda", "pchelovodam", "recepty-s-medom"):
        return "/" + parts[0] + "/:slug" * (len(parts) - 1)
    return path or "/"


def schema(v, depth=0):
    """Грубая схема JSON: тип + вложенность + пример."""
    if depth > 6:
        return "…"
    if isinstance(v, dict):
        return OrderedDict((k, schema(x, depth + 1)) for k, x in v.items())
    if isinstance(v, list):
        return [schema(v[0], depth + 1)] if v else []
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, (int, float)):
        return f"number (e.g. {v})"
    if v is None:
        return "null"
    s = str(v)
    if s.lstrip().startswith("<"):
        return f"html ({len(s)} chars)"
    return f"string (e.g. {s[:40]!r})"


def body_text(content):
    text = content.get("text")
    if text is None:
        return None
    if content.get("encoding") == "base64":
        try:
            return base64.b64decode(text).decode("utf-8", "replace")
        except Exception:
            return None
    return text


def parse_request_body(req):
    pd = req.get("postData") or {}
    mime = (pd.get("mimeType") or "").lower()
    if pd.get("params"):
        return "form", php_nest([(p.get("name"), p.get("value", "")) for p in pd["params"]])
    text = pd.get("text") or ""
    if not text:
        return None, None
    if "json" in mime:
        try:
            return "json", mask_json(json.loads(text))
        except Exception:
            return "raw", scrub(text[:500])
    if "x-www-form-urlencoded" in mime:
        return "form", php_nest(urllib.parse.parse_qsl(text, keep_blank_values=True))
    if "multipart/form-data" in mime:
        pairs = re.findall(r'name="([^"]+)"\r?\n\r?\n(.*?)\r?\n--', text, re.S)
        return "multipart", php_nest(pairs)
    return "raw", scrub(text[:500])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("har")
    ap.add_argument("--out", default=os.path.join(ROOT, "docs", "har-report.md"))
    ap.add_argument("--fixtures-dir", help="сохранить тела ответов динамических запросов сюда (JSON/HTML)")
    ap.add_argument("--all-hosts", action="store_true", help="не отбрасывать сторонние домены")
    args = ap.parse_args()

    har = json.load(open(args.har, encoding="utf-8"))
    entries = har.get("log", {}).get("entries", [])
    groups = OrderedDict()
    pages, static_count, skipped = defaultdict(int), 0, defaultdict(int)

    for i, e in enumerate(entries):
        req, res = e["request"], e["response"]
        u = urllib.parse.urlsplit(req["url"])
        host = (u.hostname or "").lower()
        if any(t in req["url"] for t in TRACKERS):
            skipped[host] += 1
            continue
        if host not in OWN_HOSTS and not args.all_hosts:
            skipped[host] += 1
            continue
        rtype = e.get("_resourceType", "")
        if STATIC_EXT.search(u.path) and req["method"] == "GET":
            static_count += 1
            continue
        mime = (res.get("content", {}).get("mimeType") or "").split(";")[0]
        if req["method"] == "GET" and (rtype == "document" or mime == "text/html") and not u.path.startswith(("/ajax", "/commerce")):
            pages[page_template(u.path) + ("?" + "&".join(sorted(k for k, _ in urllib.parse.parse_qsl(u.query))) if u.query else "")] += 1
            if not u.path.startswith(("/basket", "/search")):
                continue
        key = (req["method"], route_template(u.path))
        g = groups.setdefault(key, {"count": 0, "status": defaultdict(int), "mime": set(), "query": OrderedDict(),
                                    "bodies": [], "resp_schema": None, "resp_samples": [], "ordinals": []})
        g["count"] += 1
        g["ordinals"].append(i)
        g["status"][res.get("status")] += 1
        g["mime"].add(mime)
        for k, v in urllib.parse.parse_qsl(u.query, keep_blank_values=True):
            g["query"].setdefault(k, set()).add(mask(k, v))
        kind, body = parse_request_body(req)
        if body is not None:
            g["bodies"].append((kind, body))
        text = body_text(res.get("content", {}))
        if text:
            if "json" in mime or text.lstrip().startswith(("{", "[")):
                try:
                    js = json.loads(text)
                    g["resp_schema"] = g["resp_schema"] or schema(mask_json(js))
                    g["resp_samples"].append(mask_json(js))
                except Exception:
                    g["resp_samples"].append(scrub(text[:2000]))
            else:
                g["resp_samples"].append(scrub(text[:2000]))

    implemented = {(m, p) for m, p in MOCK_ROUTES}
    lines = [f"# Отчёт по HAR: `{os.path.basename(args.har)}`", "",
             f"Всего записей: {len(entries)}; статика своего домена: {static_count}; "
             f"пропущено (сторонние/трекеры): {sum(skipped.values())}", ""]
    if skipped:
        lines += ["Сторонние домены: " + ", ".join(f"{h} ({n})" for h, n in sorted(skipped.items(), key=lambda x: -x[1])), ""]
    lines += ["## Страницы (документы)", "", "| шаблон | запросов |", "|---|---|"]
    lines += [f"| `{p}` | {n} |" for p, n in sorted(pages.items())]
    lines += ["", "## Динамические запросы", ""]
    for (method, path), g in groups.items():
        mark = "✅ в моке" if (method, path) in implemented else "⚠️ НЕТ В МОКЕ"
        lines += [f"### `{method} {path}` — {g['count']}× — {mark}", "",
                  f"- статусы: {dict(g['status'])}; content-type: {', '.join(sorted(m for m in g['mime'] if m)) or '—'}",
                  f"- записи HAR (ordinals): {g['ordinals'][:20]}"]
        if g["query"]:
            lines.append("- query: " + ", ".join(f"`{k}`={sorted(v)[:5]}" for k, v in g["query"].items()))
        seen = set()
        for kind, body in g["bodies"]:
            sig = json.dumps(body, ensure_ascii=False, sort_keys=True)[:4000]
            if sig in seen:
                continue
            seen.add(sig)
            lines += [f"- тело запроса ({kind}):", "```json", json.dumps(body, ensure_ascii=False, indent=2)[:3000], "```"]
            if len(seen) >= 4:
                break
        if g["resp_schema"] is not None:
            lines += ["- схема ответа:", "```json", json.dumps(g["resp_schema"], ensure_ascii=False, indent=2)[:4000], "```"]
        if g["resp_samples"]:
            s = g["resp_samples"][0]
            sample = json.dumps(s, ensure_ascii=False, indent=2) if not isinstance(s, str) else s
            lines += ["- пример ответа:", "```", sample[:3000], "```"]
        lines.append("")
    missing = [(m, p) for (m, p) in groups if (m, p) not in implemented]
    lines += ["## Итог", "", f"Динамических маршрутов в HAR: {len(groups)}; не реализовано в моке: {len(missing)}"]
    lines += [f"- `{m} {p}`" for m, p in missing]

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"report: {args.out}  (routes: {len(groups)}, missing in mock: {len(missing)})")

    if args.fixtures_dir:
        os.makedirs(args.fixtures_dir, exist_ok=True)
        for (method, path), g in groups.items():
            name = (method + "_" + path.strip("/").replace("/", "_").replace(":", "") or "root")[:120]
            for n, s in enumerate(g["resp_samples"][:5]):
                ext = "json" if not isinstance(s, str) else "html"
                with open(os.path.join(args.fixtures_dir, f"{name}.{n}.{ext}"), "w", encoding="utf-8") as f:
                    f.write(json.dumps(s, ensure_ascii=False, indent=2) if ext == "json" else s)
        print(f"fixtures: {args.fixtures_dir}")


if __name__ == "__main__":
    sys.exit(main())
