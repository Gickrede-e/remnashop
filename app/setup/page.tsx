import { setupGuides } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <div className="container py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Setup</p>
        <h1 className="mt-3 font-['Space_Grotesk'] text-4xl font-semibold">Настройка клиентов</h1>
        <p className="mt-3 text-muted-foreground">После покупки откройте subscription URL в совместимом клиенте. Ниже короткие инструкции по платформам.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {setupGuides.map((guide) => (
          <Card key={guide.platform}>
            <CardHeader>
              <CardTitle>{guide.platform}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground">
                {guide.steps.map((step) => (
                  <li key={step} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
