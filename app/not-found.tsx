import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="appStatePage">
      <Card className="appStateCard">
        <CardHeader>
          <CardTitle>Страница не найдена</CardTitle>
          <CardDescription>Проверьте адрес или вернитесь на главную страницу GickShop.</CardDescription>
        </CardHeader>
        <CardContent className="appStateBody">
          <Button asChild>
            <Link href="/">На главную</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
