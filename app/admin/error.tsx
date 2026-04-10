"use client";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="surface-feature">
      <CardHeader>
        <ScreenHeader
          eyebrow="Админ-панель"
          title="Ошибка в админке"
          description="Повторите запрос или вернитесь позже. Ошибка поймана на уровне admin layout."
          actions={<Button onClick={reset}>Повторить</Button>}
        />
      </CardHeader>
      <CardContent className="routeStateInfo">
        <CardTitle className="routeStateInfoTitle">Что можно сделать сейчас</CardTitle>
        <CardDescription className="routeStateInfoCopy">
          Повторная загрузка не меняет маршрут и не обходит проверки доступа. После сброса вы останетесь в текущем
          разделе админки.
        </CardDescription>
      </CardContent>
    </Card>
  );
}
