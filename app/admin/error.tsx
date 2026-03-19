"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ошибка в админке</CardTitle>
        <CardDescription>Повторите запрос или вернитесь позже. Ошибка поймана на уровне admin layout.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={reset}>Повторить</Button>
      </CardContent>
    </Card>
  );
}
