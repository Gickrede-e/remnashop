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
    <div className="adminWorkspacePage adminWorkspace adminSurfacePage">
      <ScreenHeader
        eyebrow="Админка"
        title="Экспорт"
        description="Скачайте данные в формате CSV для работы в Excel или Google Sheets."
      />

      <AdminRecordList
        title="Наборы для выгрузки"
        description="Файлы корректно открываются в Excel и любых табличных редакторах."
      >
        <div className="adminExportGrid">
          {exports.map((item) => (
            <AdminRecordCard
              key={item.href}
              title={item.label}
              subtitle={item.description}
              metadata={[
                { label: "Формат", value: "CSV" },
                { label: "Совместимость", value: "Excel, Google Sheets" }
              ]}
              actions={
                <Button asChild className="commandButton commandButtonPrimary">
                  <a href={item.href}>Скачать CSV</a>
                </Button>
              }
            />
          ))}
        </div>
      </AdminRecordList>
    </div>
  );
}
