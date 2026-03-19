"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container py-20">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Что-то пошло не так</CardTitle>
          <CardDescription>Приложение поймало ошибку на уровне страницы. Можно попробовать повторить запрос.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset}>Повторить</Button>
        </CardContent>
      </Card>
    </div>
  );
}
