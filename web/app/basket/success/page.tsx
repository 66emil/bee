import type { Metadata } from "next";
import { OrderSuccess } from "@/components/checkout/success";
import { mainPhone } from "@/lib/site";

export const metadata: Metadata = { title: "Заказ оформлен" };

export default function Page() {
  return (
    <div className="container-x pb-24 pt-12 md:pt-20">
      <OrderSuccess phone={mainPhone} />
    </div>
  );
}
