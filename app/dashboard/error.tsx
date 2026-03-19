"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Не удалось загрузить кабинет</CardTitle>
        <CardDescription>Попробуйте повторить запрос или перезагрузите страницу.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={reset}>Повторить</Button>
      </CardContent>
    </Card>
  );
}
