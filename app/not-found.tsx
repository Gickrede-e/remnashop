import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="container py-20">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Страница не найдена</CardTitle>
          <CardDescription>Проверьте адрес или вернитесь на главную страницу GickShop.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">На главную</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
