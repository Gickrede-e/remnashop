import { marketingFaq } from "@/lib/constants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FaqPage() {
  return (
    <div className="container py-8 sm:py-10 lg:py-14">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <section className="surface-feature p-5 sm:p-7">
          <p className="section-kicker">FAQ</p>
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Часто задаваемые вопросы</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
            Короткие ответы на самые частые вопросы о подключении, оплате, продлении и работе GickVPN
            на разных устройствах.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="surface-soft px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ответов</p>
              <p className="mt-2 text-2xl font-semibold text-white">{marketingFaq.length}</p>
            </div>
            <div className="surface-soft px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Формат</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">Оплата, подключение, устройства и продление.</p>
            </div>
          </div>
        </section>

        <Accordion className="grid gap-3" collapsible type="single">
          {marketingFaq.map((item, index) => (
            <AccordionItem key={item.question} value={`faq-${index}`} className="surface-soft px-4 sm:px-5">
              <AccordionTrigger className="py-5 text-left text-base leading-6 text-white">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-6 text-zinc-300">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
