import { setupGuides } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  return (
    <div className="container py-8 sm:py-10 lg:py-14">
      <div className="grid gap-6">
        <section className="surface-feature p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)] lg:items-end">
            <div className="space-y-4">
              <p className="section-kicker">Настройка</p>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">Подключение занимает пару минут</h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                  Выберите свою платформу, установите приложение и добавьте ссылку подключения из кабинета.
                  Всё разбито на короткие шаги без лишних технических деталей.
                </p>
              </div>
            </div>

            <div className="surface-soft p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Поддерживаемые платформы</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {setupGuides.map((guide) => guide.platform).join(", ")}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {setupGuides.map((guide) => (
            <Card key={guide.platform} className="surface-soft">
              <CardHeader className="p-5 sm:p-6">
                <CardTitle>{guide.platform}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
                <ol className="grid gap-3 text-sm leading-6 text-zinc-300">
                  {guide.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
