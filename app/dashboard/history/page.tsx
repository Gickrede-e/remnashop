import { redirect } from "next/navigation";

import { PaymentHistoryList } from "@/components/blocks/dashboard/payment-history-list";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardHistoryPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const payments = await prisma.payment.findMany({
    where: {
      userId: session.userId
    },
    include: {
      plan: true,
      promoCode: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Личный кабинет"
        title="История платежей"
        description="Список операций по тарифам, промокодам и текущим статусам оплаты без переключения между экранами."
      />
      <PaymentHistoryList payments={payments} />
    </div>
  );
}
