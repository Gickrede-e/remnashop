import { marketingFaq } from "@/lib/constants";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function FaqPage() {
  return (
    <div className="container py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">FAQ</p>
        <h1 className="mt-3 font-['Space_Grotesk'] text-4xl font-semibold">Часто задаваемые вопросы</h1>
      </div>
      <Accordion className="space-y-3" collapsible type="single">
        {marketingFaq.map((item, index) => (
          <AccordionItem key={item.question} value={`faq-${index}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
