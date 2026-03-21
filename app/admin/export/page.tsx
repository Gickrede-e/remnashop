import Link from "next/link";

import { AdminRecordCard, AdminRecordList } from "@/components/blocks/admin/admin-record-list";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";

const exports = [
  {
    href: "/api/admin/export/users",
    label: "Пользователи",
    description: "Аккаунты, роли и статус доступа для ручной сверки или выгрузки поддержки."
  },
  {
    href: "/api/admin/export/payments",
    label: "Платежи",
    description: "История транзакций и статусов для бухгалтерии или проверки спорных оплат."
  },
  {
    href: "/api/admin/export/subscriptions",
    label: "Подписки",
    description: "Текущие доступы, сроки действия и остатки трафика в одном CSV."
  }
];

export default function AdminExportPage() {
  return (
    <div className="grid gap-4 sm:gap-6">
      <ScreenHeader
        eyebrow="Админка"
        title="Экспорт"
        description="Готовые CSV-выгрузки без лишних декоративных секций и с быстрым действием прямо из списка."
      />

      <AdminRecordList
        title="Наборы для выгрузки"
        description="Файлы отдаются в CSV с кодировкой UTF-8 BOM, чтобы без проблем открываться в Excel."
      >
        <div className="grid gap-3">
          {exports.map((item) => (
            <AdminRecordCard
              key={item.href}
              title={item.label}
              subtitle={item.description}
              metadata={[
                { label: "Формат", value: "CSV" },
                { label: "Кодировка", value: "UTF-8 BOM" }
              ]}
              actions={
                <Button asChild className="w-full sm:w-auto">
                  <Link href={item.href}>Скачать CSV</Link>
                </Button>
              }
            />
          ))}
        </div>
      </AdminRecordList>
    </div>
  );
}
