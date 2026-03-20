import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqItems = [
  {
    value: "q1",
    question: "Когда создаётся VPN-аккаунт?",
    answer: "Только после первой успешной оплаты. До этого аккаунт в Remnawave не создаётся."
  },
  {
    value: "q2",
    question: "Что происходит при продлении?",
    answer:
      "Если подписка активна, срок и трафик суммируются. Если истекла, новый период начинается с текущего момента."
  },
  {
    value: "q3",
    question: "Какие есть способы оплаты?",
    answer: "На checkout доступны ЮKassa и Platega. После создания платежа вы переходите на страницу провайдера."
  },
  {
    value: "q4",
    question: "Как получить ссылку на конфиг?",
    answer:
      "После активации подписки ссылка на конфиг появляется в личном кабинете и синхронизируется из Remnawave."
  }
];

export function FaqList() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqItems.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
