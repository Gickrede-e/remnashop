"use client";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="surface-feature">
      <CardHeader>
        <ScreenHeader
          eyebrow="Личный кабинет"
          title="Не удалось загрузить кабинет"
          description="Попробуйте повторить запрос или перезагрузите страницу."
          actions={<Button onClick={reset}>Повторить</Button>}
        />
      </CardHeader>
      <CardContent className="routeStateInfo">
        <CardTitle className="routeStateInfoTitle">Что можно сделать сейчас</CardTitle>
        <CardDescription className="routeStateInfoCopy">
          Состояние маршрута сохранится. После повтора загрузки вы вернётесь в тот же раздел кабинета.
        </CardDescription>
      </CardContent>
    </Card>
  );
}
