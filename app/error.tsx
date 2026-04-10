"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="appStatePage">
      <Card className="appStateCard">
        <CardHeader>
          <CardTitle>Что-то пошло не так</CardTitle>
          <CardDescription>Приложение поймало ошибку на уровне страницы. Можно попробовать повторить запрос.</CardDescription>
        </CardHeader>
        <CardContent className="appStateBody">
          <Button onClick={reset}>Повторить</Button>
        </CardContent>
      </Card>
    </div>
  );
}
