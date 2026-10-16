"""Крошечный толерантный HTML-парсер на stdlib (html.parser) с поиском по тегу/классу/id/атрибуту.
Нужен, чтобы не тянуть bs4/lxml в скрипты разбора зеркала."""
from html import escape
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param",
        "source", "track", "wbr"}


class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = dict(attrs or {})
        self.children = []
        self.parent = parent

    # ---- навигация
    def iter(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.iter()

    def classes(self):
        return (self.attrs.get("class") or "").split()

    def matches(self, tag=None, cls=None, id=None, **attrs):
        if tag and self.tag != tag:
            return False
        if cls and cls not in self.classes():
            return False
        if id and self.attrs.get("id") != id:
            return False
        for k, v in attrs.items():
            k = k.replace("_", "-")
            if v is True:
                if k not in self.attrs:
                    return False
            elif self.attrs.get(k) != v:
                return False
        return True

    def find_all(self, tag=None, cls=None, id=None, **attrs):
        return [n for n in self.iter() if n.matches(tag, cls, id, **attrs)]

    def find(self, tag=None, cls=None, id=None, **attrs):
        for n in self.iter():
            if n.matches(tag, cls, id, **attrs):
                return n
        return None

    def closest(self, tag=None, cls=None, id=None):
        n = self.parent
        while n is not None:
            if n.matches(tag, cls, id):
                return n
            n = n.parent
        return None

    def get(self, k, default=None):
        return self.attrs.get(k, default)

    # ---- содержимое
    def text(self):
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return "".join(out)

    def clean_text(self):
        return " ".join(self.text().replace("\xa0", " ").split())

    def inner_html(self):
        return "".join(c if isinstance(c, str) else c.outer_html() for c in self.children)

    def outer_html(self):
        attrs = "".join(f' {k}="{escape(v, quote=True)}"' if v is not None else f" {k}"
                        for k, v in self.attrs.items())
        if self.tag in VOID:
            return f"<{self.tag}{attrs}>"
        return f"<{self.tag}{attrs}>{self.inner_html()}</{self.tag}>"

    def __repr__(self):
        return f"<Node {self.tag} {self.attrs}>"


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root")
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent
        # непарный закрывающий тег — игнорируем

    def handle_data(self, data):
        self.cur.children.append(data)


def parse(html_text):
    b = _Builder()
    b.feed(html_text)
    b.close()
    return b.root
