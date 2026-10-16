import settings from "@/data/settings.json";

export type DeliveryMethod = {
  id: string;
  domId: string;
  title: string;
  price: number;
  needsAddress: boolean;
  payments: string[];
};
export type PaymentMethod = { id: string; domId: string; title: string };

export const site = settings as unknown as {
  siteName: string;
  phones: { display: string; tel: string; label: string }[];
  email: string;
  address: { postcode: string; city: string; street: string; mapUrl: string };
  workHours: { days: string; from: string; to: string }[];
  legal: { company: string; ogrn: string };
  socials: { id: string; url: string }[];
  deliveryMethods: DeliveryMethod[];
  paymentMethods: PaymentMethod[];
};

export const MAIN_NAV = [
  { title: "Каталог мёда", path: "/katalog-meda" },
  { title: "Пчеловодам", path: "/pchelovodam" },
  { title: "О нас", path: "/about" },
  { title: "Рецепты", path: "/recepty-s-medom" },
  { title: "Музей", path: "/museum" },
  { title: "Контакты", path: "/contacts" },
];

export const mainPhone = site.phones[0];
