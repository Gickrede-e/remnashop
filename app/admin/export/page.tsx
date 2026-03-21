import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const exports = [
  { href: "/api/admin/export/users", label: "Пользователи" },
  { href: "/api/admin/export/payments", label: "Платежи" },
  { href: "/api/admin/export/subscriptions", label: "Подписки" }
];

export default function AdminExportPage() {
  return (
    <div className="grid gap-6">
      <section className="surface-feature p-5 sm:p-7">
        <p className="section-kicker">Экспорт</p>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Выгрузка данных в CSV</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
          Скачайте пользователей, платежи или подписки в формате CSV. Файлы экспортируются в UTF-8 BOM
          для корректного открытия в Excel.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {exports.map((item) => (
          <Card key={item.href} className="surface-soft">
            <CardHeader className="p-5 sm:p-6">
              <CardTitle>{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0 sm:p-6 sm:pt-0">
              <p className="text-sm leading-6 text-zinc-400">
                Скачать актуальную выгрузку по разделу «{item.label.toLowerCase()}».
              </p>
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-sm text-white"
              >
                Скачать CSV
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
