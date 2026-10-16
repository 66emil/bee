// Сорта мёда: цвет, характер, короткое описание.
// РЕДАКЦИОННЫЕ ДАННЫЕ ПРОТОТИПА — собраны из описаний на сайте (аромат/вкус/структура товаров и тексты категорий).
// Тон (0 — светлый, 100 — тёмный) и цвет — по фото продукта. Подтвердить у заказчика.

export type Taste = "gentle" | "rich" | "bitter";

export type Variety = {
  slug: string; // slug категории в /katalog-meda
  name: string; // короткое имя сорта
  tone: number; // 0…100, светлый → тёмный
  color: string; // цвет мёда для шкалы
  taste: Taste;
  tags: string[];
  note: string; // одна строка о характере
  coverId: number; // товар, чьё фото представляет сорт
};

export const TASTES: Record<Taste, { title: string; one: string; label: string; hint: string }> = {
  gentle: { title: "Нежные", one: "Нежный", label: "Нежный сорт", hint: "Светлые, сладкие, с цветочным ароматом" },
  rich: { title: "Насыщенные", one: "Насыщенный", label: "Насыщенный сорт", hint: "Янтарные, пряные, с травами и сухофруктами" },
  bitter: { title: "С горчинкой", one: "С горчинкой", label: "Сорт с горчинкой", hint: "Тёмные, плотные, для гурманов" },
};

export const VARIETIES: Variety[] = [
  {
    slug: "akacievyj-myod",
    name: "Акациевый",
    tone: 6,
    color: "#f4e4a8",
    taste: "gentle",
    tags: ["нежный", "сливочный"],
    note: "Прозрачный и текучий, с ванильным нектаром в послевкусии",
    coverId: 466,
  },
  {
    slug: "lipovyj-myod",
    name: "Липовый",
    tone: 14,
    color: "#f0dc9a",
    taste: "gentle",
    tags: ["свежий", "лёгкая терпкость"],
    note: "Тонкий липовый аромат раннего лета",
    coverId: 445,
  },
  {
    slug: "donnikovyj-myod",
    name: "Донниковый",
    tone: 20,
    color: "#eed58c",
    taste: "gentle",
    tags: ["ванильный", "мягкий"],
    note: "Свежее сено, светлые сухофрукты и ваниль",
    coverId: 471,
  },
  {
    slug: "cvetochnyj-myod",
    name: "Цветочный",
    tone: 34,
    color: "#e8bd5c",
    taste: "gentle",
    tags: ["разнотравье", "универсальный"],
    note: "Нектар луговых цветов — мёд на каждый день",
    coverId: 639,
  },
  {
    slug: "lesnoj-myod",
    name: "Лесной",
    tone: 42,
    color: "#e3ac4a",
    taste: "rich",
    tags: ["таёжный", "дикоросы"],
    note: "Тайга Дальнего Востока и Сибири",
    coverId: 475,
  },
  {
    slug: "gornyj-myod",
    name: "Горный",
    tone: 52,
    color: "#d6973a",
    taste: "rich",
    tags: ["травяной", "альпийский"],
    note: "Альпийские луга Алтая, вереск и эспарцет",
    coverId: 486,
  },
  {
    slug: "dyagilevyj-myod",
    name: "Дягилевый",
    tone: 64,
    color: "#c47a26",
    taste: "rich",
    tags: ["пряный", "сухофрукты"],
    note: "Абрикос, изюм и чернослив; древесно-шоколадное послевкусие",
    coverId: 452,
  },
  {
    slug: "kashtanovyj-myod",
    name: "Каштановый",
    tone: 80,
    color: "#934d1a",
    taste: "bitter",
    tags: ["несладкий", "с горчинкой"],
    note: "Пикантная горчинка грейпфрутовой цедры",
    coverId: 468,
  },
  {
    slug: "grechishnyj-myod",
    name: "Гречишный",
    tone: 92,
    color: "#5e2e10",
    taste: "bitter",
    tags: ["пряный", "терпкий"],
    note: "Чернослив, мускат, корица и свежий пряник",
    coverId: 454,
  },
];

const bySlug = new Map(VARIETIES.map((v) => [v.slug, v]));
export const varietyBySlug = (slug: string) => bySlug.get(slug) ?? null;

/** Градиент медовой шкалы: от светлого к тёмному */
export const HONEY_GRADIENT =
  "linear-gradient(90deg, #f7ecc4 0%, #efd68c 18%, #e5b553 38%, #d08f30 58%, #9d5420 78%, #4f250c 100%)";
