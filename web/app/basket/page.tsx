import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Checkout } from "@/components/checkout/checkout";
import { mainPhone, site } from "@/lib/site";

export const metadata: Metadata = { title: "Корзина и оформление заказа" };

export default function Page() {
  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <Breadcrumbs items={[{ title: "Корзина" }]} />
      <h1 className="t-h1 mb-10 mt-6">Оформление заказа</h1>
      <Checkout deliveries={site.deliveryMethods} payments={site.paymentMethods} phone={mainPhone} />
    </div>
  );
}
