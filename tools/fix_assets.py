#!/usr/bin/env python3
"""
Шаг 2: проверка и докачка недостающих ресурсов локальной копии ./site.

Что делает:
  * находит в HTML/CSS все ссылки на ресурсы: src, href, srcset, data-src и прочие
    lazy-load атрибуты, style="...url()", <style>, url()/@import в CSS, og:image и т.п.;
  * ссылки на www.dommeda.ru / dommeda.ru (абсолютные и относительные) сводит к локальным
    файлам, недостающие докачивает (с паузой, учитывая robots.txt, включая Allow с '*');
  * ресурсы с других доменов (шрифты, CSS/JS-библиотеки, картинки) кладёт в site/_ext/<host>/;
  * переписывает ссылки на относительные пути, чтобы копия работала и с file://, и с сервера;
  * вырезает счётчики (Яндекс.Метрика и т.п.), чтобы локальные визиты не попадали
    в аналитику заказчика (--keep-analytics чтобы оставить);
  * пишет отчёт в logs/assets_report.json.

Запуск:  python3 -I tools/fix_assets.py [--dry-run] [--wait 1.5]
"""
import argparse
import json
import os
import posixpath
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE = os.path.join(ROOT, "site")
REPORT = os.path.join(ROOT, "logs", "assets_report.json")

ORIGIN = "https://www.dommeda.ru"
OWN_HOSTS = {"www.dommeda.ru", "dommeda.ru"}
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36 dommeda-prototype-mirror")

# Счётчики/трекеры: не качаем, из HTML вырезаем.
TRACKER_HOSTS = ("mc.yandex.ru", "mc.yandex.com", "google-analytics.com",
                 "googletagmanager.com", "top-fwz1.mail.ru", "counter.yadro.ru",
                 "vk.com/rtrg", "connect.facebook.net")

ASSET_EXT = {
    ".css", ".js", ".mjs", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif",
    ".ico", ".bmp", ".woff", ".woff2", ".ttf", ".eot", ".otf", ".mp4", ".webm",
    ".ogg", ".mp3", ".json", ".pdf", ".swf", ".cur",
}
PAGE_EXT = {"", ".html", ".htm", ".php"}

# Ссылки, которые не надо трогать.
SKIP_SCHEMES = ("mailto:", "tel:", "javascript:", "skype:", "data:", "#", "about:",
                "callto:", "whatsapp:", "viber:", "tg:", "blob:")
# Те же правила, что и в wget --reject-regex: сортировки/кол-во на странице — дубли.
REJECT_RE = re.compile(r"[?&](sort|display)=|[?]$|/search[?]")

ATTRS = ("src", "href", "data-src", "data-original", "data-lazy", "data-lazy-src",
         "data-bg", "data-background", "data-background-image", "data-image",
         "data-img", "data-full", "data-zoom-image", "data-large", "data-thumb",
         "poster", "data-href", "data-fancybox-href", "data-poster")
SRCSET_ATTRS = ("srcset", "data-srcset", "data-lazy-srcset")

TAG_RE = re.compile(r"<([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*?)?/?>", re.S)
ATTR_RE = re.compile(r"""([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')""", re.S)
CSS_URL_RE = re.compile(r"""url\(\s*(['"]?)([^'")]+?)\1\s*\)""", re.I)
CSS_IMPORT_RE = re.compile(r"""@import\s+(['"])([^'"]+)\1""", re.I)
STYLE_BLOCK_RE = re.compile(r"(<style[^>]*>)(.*?)(</style>)", re.S | re.I)

METRIKA_RE = re.compile(
    r"<script[^>]*>(?:(?!</script>).)*?mc\.yandex\.ru/metrika(?:(?!</script>).)*?</script>\s*"
    r"(?:<noscript>(?:(?!</noscript>).)*?mc\.yandex\.ru/watch(?:(?!</noscript>).)*?</noscript>)?",
    re.S | re.I)


# ---------------------------------------------------------------- robots.txt
class Robots:
    """Минимальный robots.txt с семантикой Google: longest match, Allow побеждает при равенстве,
    поддержка '*' и '$'."""

    def __init__(self, text):
        self.rules = []  # (allow: bool, regex, length)
        active = False
        for raw in text.splitlines():
            line = raw.split("#", 1)[0].strip()
            if not line or ":" not in line:
                continue
            key, val = (s.strip() for s in line.split(":", 1))
            key = key.lower()
            if key == "user-agent":
                active = val == "*"
            elif active and key in ("allow", "disallow") and val:
                pat = re.escape(val).replace(r"\*", ".*")
                if pat.endswith(r"\$"):
                    pat = pat[:-2] + "$"
                self.rules.append((key == "allow", re.compile(pat), len(val)))

    def allowed(self, path):
        best = None
        for allow, rx, ln in self.rules:
            if rx.match(path):
                if best is None or ln > best[1] or (ln == best[1] and allow):
                    best = (allow, ln)
        return True if best is None else best[0]


# ---------------------------------------------------------------- helpers
def is_tracker(url):
    return any(t in url for t in TRACKER_HOSTS)


def ext_of(path):
    return posixpath.splitext(path)[1].lower()


def local_path_for(url):
    """URL -> путь внутри site/ (по тем же правилам, что у wget -E --restrict-file-names=windows),
    либо None, если это не то, что мы храним локально."""
    p = urllib.parse.urlsplit(url)
    host = (p.hostname or "").lower()
    path = re.sub(r"/{2,}", "/", urllib.parse.unquote(p.path or "/"))
    ext = ext_of(path)
    if host in OWN_HOSTS:
        # файл без расширения, который wget уже сохранил как есть (images/u/2108/unnamedjpg)
        if not p.query and os.path.isfile(os.path.join(SITE, path.lstrip("/"))):
            return path.lstrip("/")
        if ext in ASSET_EXT:
            # query у статики — это cache-buster (?0.12.1), отбрасываем
            return path.lstrip("/")
        # страница
        if path.endswith("/"):
            path += "index"
        q = ("@" + p.query) if p.query else ""
        rel = path.lstrip("/") + q
        if ext not in (".html", ".htm"):
            rel += ".html"
        return rel
    # внешний домен: только статика
    if ext in ASSET_EXT:
        return posixpath.join("_ext", host, path.lstrip("/"))
    if host == "fonts.googleapis.com" or "css" in p.path.split("/")[-1:]:
        name = (path.strip("/").replace("/", "_") or "index") + (
            "@" + re.sub(r"[^A-Za-z0-9=&,:+.-]", "_", p.query) if p.query else "")
        return posixpath.join("_ext", host, name[:180] + ".css")
    return None


def rel_link(from_file, target_rel, fragment=""):
    """Относительная ссылка от файла from_file (путь в site/) на target_rel (путь в site/)."""
    start = posixpath.dirname(from_file)
    r = posixpath.relpath(target_rel, start or ".")
    r = urllib.parse.quote(r, safe="/@=&-._~,+!$'()*;:")
    return r + (("#" + fragment) if fragment else "")


class Fixer:
    def __init__(self, args):
        self.args = args
        self.robots = None
        self.last_req = defaultdict(float)
        self.report = {
            "downloaded": [], "failed": defaultdict(list), "robots_blocked": defaultdict(list),
            "skipped_trackers": set(), "external_pages_left": set(), "rewritten": 0,
            "analytics_removed": [], "broken_local": defaultdict(list),
        }
        self.done_urls = {}  # url -> local rel or None (failed)
        self.known_404 = self.load_wget_404()
        self.redirect_files = {} if args.dry_run else self.materialize_redirects()

    @staticmethod
    def materialize_redirects():
        """301/302 из logs/wget.log: wget сохраняет ответ под СТАРЫМ именем (дубль страницы).
        Заменяем такие файлы заглушками с meta refresh, пишем карту для мока
        (mock-backend/data/redirects.json) и возвращаем {старый файл: целевой файл} —
        ссылки на старые адреса переписываются сразу на цель."""
        log = os.path.join(ROOT, "logs", "wget.log")
        if not os.path.isfile(log):
            return {}
        found, cur, status = OrderedDict(), None, None
        for line in open(log, encoding="utf-8", errors="replace"):
            m = re.match(r"--\S+ \S+--\s+(\S+)", line)
            if m:
                cur, status = m.group(1), None
                continue
            m = re.search(r"awaiting response\.\.\. (\d{3})", line)
            if m:
                status = int(m.group(1))
                continue
            m = re.match(r"Location: (\S+)", line)
            if m and cur and status in (301, 302, 303, 307, 308):
                src = urllib.parse.urlsplit(cur).path
                dst = urllib.parse.urlsplit(urllib.parse.urljoin(cur, m.group(1))).path or "/"
                found.setdefault(src, (dst, status))
        mapping, mock = {}, []
        for src, (dst, status) in found.items():
            src_file = local_path_for(ORIGIN + src)
            dst_file = local_path_for(ORIGIN + dst)
            if not src_file or not dst_file or not os.path.isfile(os.path.join(SITE, dst_file)):
                continue
            rel = posixpath.relpath(dst_file, posixpath.dirname(src_file) or ".")
            os.makedirs(os.path.dirname(os.path.join(SITE, src_file)) or SITE, exist_ok=True)
            with open(os.path.join(SITE, src_file), "w", encoding="utf-8") as f:
                f.write(f'<!doctype html>\n<html><head><meta charset="utf-8">\n'
                        f'<!-- {status} {src} -> {dst} (так отвечает живой сайт) -->\n'
                        f'<meta http-equiv="refresh" content="0; url={rel}">\n'
                        f'<link rel="canonical" href="{rel}"><title>Redirect</title></head>\n'
                        f'<body><a href="{rel}">{dst}</a></body></html>\n')
            mapping[src_file] = dst_file
            mock.append({"from": src, "to": dst, "status": status})
        out = os.path.join(ROOT, "mock-backend", "data", "redirects.json")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(mock, f, ensure_ascii=False, indent=2)
        if mock:
            print(f"redirects: {len(mock)} -> {os.path.relpath(out, ROOT)}")
        return mapping

    @staticmethod
    def load_wget_404():
        """URL, на которые wget уже получил 404 (logs/wget.log)."""
        log = os.path.join(ROOT, "logs", "wget.log")
        out, last_url = set(), None
        if os.path.isfile(log):
            for line in open(log, encoding="utf-8", errors="replace"):
                m = re.match(r"--\S+ \S+--\s+(\S+)", line)
                if m:
                    last_url = m.group(1)
                elif "ERROR 404" in line and last_url:
                    out.add(re.sub(r"(?<!:)/{2,}", "/", last_url))
        # и 404 из прошлого запуска этого скрипта
        if os.path.isfile(REPORT):
            try:
                prev = json.load(open(REPORT, encoding="utf-8"))
                out |= {u for u, why in prev.get("failed", {}).items() if any("HTTP 404" in w for w in why)}
            except ValueError:
                pass
        return out

    # ------------------------------------------------------------ network
    def polite_wait(self, host):
        wait = self.args.wait if host in OWN_HOSTS else self.args.wait / 3
        delta = time.time() - self.last_req[host]
        target = wait * random.uniform(0.5, 1.5)
        if delta < target:
            time.sleep(target - delta)
        self.last_req[host] = time.time()

    def fetch(self, url):
        host = urllib.parse.urlsplit(url).hostname or ""
        self.polite_wait(host)
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers.get_content_type(), r.read()

    def ensure(self, url, referer):
        """Убедиться, что url есть локально. Возвращает путь в site/ или None."""
        if url in self.done_urls:
            return self.done_urls[url]
        self.done_urls[url] = self._ensure(url, referer)
        return self.done_urls[url]

    def _ensure(self, url, referer):
        rel = local_path_for(url)
        if rel is None:
            return None
        if rel in self.redirect_files:
            return self.redirect_files[rel]
        full = os.path.join(SITE, rel)
        if os.path.isfile(full):
            return rel
        p = urllib.parse.urlsplit(url)
        if (p.hostname or "") in OWN_HOSTS:
            path_q = re.sub(r"/{2,}", "/", p.path) + (("?" + p.query) if p.query else "")
            if not self.robots.allowed(path_q):
                self.report["robots_blocked"][url].append(referer)
                return None
            url = ORIGIN + path_q  # всегда качаем с основного хоста
            if url in self.known_404:  # wget уже получил 404 — не дёргаем сервер повторно
                self.report["failed"][url].append(f"HTTP 404 (wget; ref: {referer})")
                return None
        if self.args.dry_run:
            print(f"  [dry] would download {url} -> {rel}")
            return None
        try:
            status, ctype, body = self.fetch(url)
        except urllib.error.HTTPError as e:
            self.report["failed"][url].append(f"HTTP {e.code} (ref: {referer})")
            return None
        except Exception as e:  # noqa
            self.report["failed"][url].append(f"{type(e).__name__}: {e} (ref: {referer})")
            return None
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "wb") as f:
            f.write(body)
        print(f"  + {url} -> {rel} ({len(body)} B, {ctype})")
        self.report["downloaded"].append({"url": url, "file": rel, "bytes": len(body),
                                          "type": ctype, "referer": referer})
        self.new_files.append(rel)
        return rel

    # ------------------------------------------------------------ resolution
    def resolve(self, ref, file_rel, kind):
        """Разобрать ссылку ref из файла file_rel.
        kind: 'asset' | 'link' (обычная <a href>) | 'css'
        Возвращает новую ссылку или None (не трогать)."""
        ref = ref.strip()
        if not ref or ref.lower().startswith(SKIP_SCHEMES):
            return None
        raw = ref.replace("&amp;", "&")
        if raw.startswith("//"):
            raw = "https:" + raw
        frag = ""
        if "#" in raw:
            raw, frag = raw.split("#", 1)
            if not raw:
                return None
        parsed = urllib.parse.urlsplit(raw)

        if parsed.scheme in ("http", "https"):
            host = (parsed.hostname or "").lower()
            if is_tracker(raw):
                self.report["skipped_trackers"].add(raw)
                return None
            if host not in OWN_HOSTS:
                if kind == "link" and ext_of(parsed.path) not in ASSET_EXT:
                    self.report["external_pages_left"].add(raw)
                    return None
                if local_path_for(raw) is None:
                    self.report["external_pages_left"].add(raw)
                    return None
            elif REJECT_RE.search(raw):
                # сортировки/количество — дубли страницы; ведём на саму страницу
                raw = urllib.parse.urlunsplit(parsed._replace(query=""))
            target = self.ensure(raw, file_rel)
            if target is None:
                return None
            return rel_link(file_rel, target, frag)

        if parsed.scheme:  # прочие схемы
            return None

        # Относительная ссылка. Сначала — относительно самого файла (так пишет wget -k).
        path = urllib.parse.unquote(parsed.path)
        cand = posixpath.normpath(posixpath.join(posixpath.dirname(file_rel), path))
        if cand in self.redirect_files:
            return rel_link(file_rel, self.redirect_files[cand], frag)
        if not cand.startswith("..") and os.path.isfile(os.path.join(SITE, cand)):
            return None  # всё в порядке
        # Иначе это оригинальная ссылка сайта (<base href="/">) — считаем от корня.
        if REJECT_RE.search(raw):
            parsed = parsed._replace(query="")
        abs_url = urllib.parse.urljoin(ORIGIN + "/", urllib.parse.urlunsplit(parsed))
        target = self.ensure(abs_url, file_rel)
        if target is None:
            self.report["broken_local"][ref].append(file_rel)
            return None
        return rel_link(file_rel, target, frag)

    # ------------------------------------------------------------ rewriting
    def fix_css_text(self, text, file_rel):
        def sub_url(m):
            new = self.resolve(m.group(2), file_rel, "asset")
            if new is None:
                return m.group(0)
            self.report["rewritten"] += 1
            return f"url({m.group(1)}{new}{m.group(1)})"

        def sub_import(m):
            new = self.resolve(m.group(2), file_rel, "asset")
            if new is None:
                return m.group(0)
            self.report["rewritten"] += 1
            return f"@import {m.group(1)}{new}{m.group(1)}"

        text = CSS_IMPORT_RE.sub(sub_import, text)
        return CSS_URL_RE.sub(sub_url, text)

    def fix_html_text(self, text, file_rel):
        if not self.args.keep_analytics:
            text, n = METRIKA_RE.subn("<!-- Яндекс.Метрика отключена в локальной копии -->\n", text)
            if n:
                self.report["analytics_removed"].append(file_rel)
        # Если wget не обнулил <base href="/">, относительные ссылки сломаются под file://
        text = re.sub(r'<base\s+href="/"\s*/?>', "<!-- base href removed -->", text)

        def fix_tag(m):
            tag = m.group(1).lower()
            body = m.group(2) or ""
            if not body:
                return m.group(0)
            attrs = {a.group(1).lower(): (a.group(3) if a.group(3) is not None else a.group(4))
                     for a in ATTR_RE.finditer(body)}

            def sub_attr(a):
                name = a.group(1).lower()
                quote = a.group(2)[0]
                val = a.group(3) if a.group(3) is not None else a.group(4)
                new = None
                if name in SRCSET_ATTRS:
                    parts, changed = [], False
                    for item in val.split(","):
                        bits = item.strip().split()
                        if not bits:
                            continue
                        r = self.resolve(bits[0], file_rel, "asset")
                        if r:
                            bits[0], changed = r, True
                        parts.append(" ".join(bits))
                    new = ", ".join(parts) if changed else None
                elif name == "style":
                    fixed = self.fix_css_text(val, file_rel)
                    new = fixed if fixed != val else None
                elif name == "content" and tag == "meta":
                    if re.search(r"\.(png|jpe?g|gif|svg|webp|ico)(\?|$)", val, re.I):
                        new = self.resolve(val, file_rel, "asset")
                elif name == "action" and tag == "form":
                    # формы обслуживает мок-бэкенд; без <base href="/"> относительный action
                    # (action="search") на вложенных страницах уехал бы — делаем его от корня
                    if val and not val.startswith(("/", "#")) and "://" not in val:
                        new = "/" + val
                elif name in ATTRS:
                    kind = "link" if (tag == "a" and name == "href") else "asset"
                    if tag == "link" and name == "href":
                        rel = (attrs.get("rel") or "").lower()
                        if rel in ("canonical", "alternate", "shortlink", "next", "prev"):
                            kind = "link"
                    new = self.resolve(val, file_rel, kind)
                if new is None or new == val:
                    return a.group(0)
                self.report["rewritten"] += 1
                return f"{a.group(1)}={quote}{new}{quote}"

            return f"<{m.group(1)}{ATTR_RE.sub(sub_attr, body)}{m.group(0)[len(m.group(1)) + 1 + len(body):]}"

        text = TAG_RE.sub(fix_tag, text)
        text = STYLE_BLOCK_RE.sub(
            lambda m: m.group(1) + self.fix_css_text(m.group(2), file_rel) + m.group(3), text)
        return text

    def process_file(self, rel):
        full = os.path.join(SITE, rel)
        ext = ext_of(rel)
        if ext not in (".html", ".htm", ".css"):
            return
        with open(full, "rb") as f:
            raw = f.read()
        text = raw.decode("utf-8", errors="surrogateescape")
        new = self.fix_html_text(text, rel) if ext in (".html", ".htm") else self.fix_css_text(text, rel)
        if new != text and not self.args.dry_run:
            with open(full, "wb") as f:
                f.write(new.encode("utf-8", errors="surrogateescape"))

    # ------------------------------------------------------------ main
    def run(self):
        robots_path = os.path.join(SITE, "robots.txt")
        if os.path.isfile(robots_path):
            robots_txt = open(robots_path, encoding="utf-8", errors="replace").read()
        else:
            robots_txt = self.fetch(ORIGIN + "/robots.txt")[2].decode("utf-8", "replace")
        self.robots = Robots(robots_txt)

        queue = sorted(
            os.path.relpath(os.path.join(dp, fn), SITE).replace(os.sep, "/")
            for dp, _, fns in os.walk(SITE) for fn in fns)
        seen = set()
        passes = 0
        while queue and passes < 6:
            passes += 1
            print(f"Pass {passes}: {len(queue)} files")
            self.new_files = []
            for rel in queue:
                if rel in seen:
                    continue
                seen.add(rel)
                self.process_file(rel)
            queue = self.new_files

        rep = self.report
        out = {
            "summary": {
                "downloaded": len(rep["downloaded"]),
                "failed": len(rep["failed"]),
                "robots_blocked": len(rep["robots_blocked"]),
                "links_rewritten": rep["rewritten"],
                "analytics_removed_from_pages": len(rep["analytics_removed"]),
                "external_pages_left_as_is": len(rep["external_pages_left"]),
            },
            "downloaded": rep["downloaded"],
            "failed": rep["failed"],
            "robots_blocked": rep["robots_blocked"],
            "broken_local": rep["broken_local"],
            "skipped_trackers": sorted(rep["skipped_trackers"]),
            "external_pages_left": sorted(rep["external_pages_left"]),
        }
        if not self.args.dry_run:
            os.makedirs(os.path.dirname(REPORT), exist_ok=True)
            with open(REPORT, "w", encoding="utf-8") as f:
                json.dump(out, f, ensure_ascii=False, indent=2, default=list)
        print(json.dumps(out["summary"], ensure_ascii=False, indent=2))
        if rep["failed"]:
            print("\nНе удалось скачать:")
            for u, why in sorted(rep["failed"].items()):
                print(f"  {u}  <- {why[0]}" + (f" (+{len(why) - 1})" if len(why) > 1 else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="ничего не качать и не менять, только показать")
    ap.add_argument("--wait", type=float, default=1.5, help="пауза между запросами к сайту, c")
    ap.add_argument("--keep-analytics", action="store_true", help="не вырезать Яндекс.Метрику")
    args = ap.parse_args()
    if not os.path.isdir(SITE):
        sys.exit(f"Нет каталога {SITE} — сначала запустите tools/mirror.sh")
    Fixer(args).run()


if __name__ == "__main__":
    main()
