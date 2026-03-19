import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const exports = [
  { href: "/api/admin/export/users", label: "Пользователи" },
  { href: "/api/admin/export/payments", label: "Платежи" },
  { href: "/api/admin/export/subscriptions", label: "Подписки" }
];

export default function AdminExportPage() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {exports.map((item) => (
        <Card key={item.href}>
          <CardHeader>
            <CardTitle>{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={item.href}
              className="inline-flex rounded-2xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 py-3 text-sm text-white"
            >
              Скачать CSV
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
