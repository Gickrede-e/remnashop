"use client";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="surface-feature">
      <CardHeader className="p-5 sm:p-6">
        <ScreenHeader
          eyebrow="Личный кабинет"
          title="Не удалось загрузить кабинет"
          description="Попробуйте повторить запрос или перезагрузите страницу."
          actions={<Button onClick={reset}>Повторить</Button>}
        />
      </CardHeader>
      <CardContent className="grid gap-3 p-5 pt-0 text-sm text-zinc-400 sm:p-6 sm:pt-0">
        <CardTitle className="text-base text-white">Что можно сделать сейчас</CardTitle>
        <CardDescription className="text-sm text-zinc-400">
          Состояние маршрута сохранится. После повтора загрузки вы вернётесь в тот же раздел кабинета.
        </CardDescription>
      </CardContent>
    </Card>
  );
}
